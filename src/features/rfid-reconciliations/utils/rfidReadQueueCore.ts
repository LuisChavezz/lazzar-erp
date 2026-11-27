import type { RfidReconciliationRead } from "../interfaces/rfid-reconciliation.interface";
import {
  classifyReadError,
  isEpcAlreadyRead,
  normalizeEpc,
  readErrorFeedback,
  readSuccessFeedback,
  type RfidReadFeedback,
} from "./rfidReadResult";

/** Una lectura de la sesión, la más reciente primero. */
export interface RfidSessionRead extends RfidReadFeedback {
  key: number;
  code: string;
}

export interface RfidReadQueueDeps {
  /** El `POST .../lecturas/` con `{epc}`. */
  send: (epc: string) => Promise<RfidReconciliationRead>;
  /** Una lectura nueva de la sesión (enviando o "Ya leído"). */
  onAdd: (read: RfidSessionRead) => void;
  /** El resultado de una lectura ya agregada. */
  onUpdate: (key: number, feedback: RfidReadFeedback) => void;
  /** Lecturas por enviar, incluida la que está en vuelo. */
  onPending: (pending: number) => void;
  /** La cola se detuvo (`400 estatus`, `404`, `403`): mensaje del backend. */
  onStop: (message: string) => void;
  /** Terminó una tanda que cambió el encuadre (lecturas nuevas o repetidas en el backend). */
  onDrained: () => void;
}

/**
 * Cola de lecturas de un encuadre, sin React (la envuelve `useRfidReadQueue`):
 * manda los EPC UNO A LA VEZ, en el orden en que llegaron.
 *
 * - Un EPC que el encuadre ya tiene (`known`: su forma canónica o la que mandó
 *   el lector) o que ya se mandó en esta sesión se avisa como "Ya leído" sin
 *   petición. Otra forma de la misma pieza sí se manda: el `400 {"epc"}` del
 *   backend la reconoce y tampoco es un error.
 * - `400 {"estatus"}` (se aceptó o canceló en otro lado), `404` o `403`
 *   DETIENEN la cola: lo pendiente se descarta y, hasta que se cree otra cola
 *   (el panel se vuelve a montar), todo `enqueue` se ignora, así la antena no
 *   sigue mandando lecturas que el backend rechazaría.
 * - Al terminar una tanda que cambió algo avisa con `onDrained`.
 */
export class RfidReadQueueCore {
  private known: ReadonlySet<string> = new Set();
  private queue: { key: number; code: string }[] = [];
  private readonly sent = new Set<string>();
  private running = false;
  private disposed = false;
  private stopped = false;
  private seq = 0;

  constructor(private readonly deps: RfidReadQueueDeps) {}

  /** Los EPC que el encuadre ya tiene (`knownReadEpcs` del detalle). */
  setKnown(known: ReadonlySet<string>): void {
    this.known = known;
  }

  get isStopped(): boolean {
    return this.stopped;
  }

  /** Encola el EPC de una etiqueta, tal como lo entregó la antena. Ignorado si la cola se detuvo. */
  enqueue(rawEpc: string): void {
    if (this.stopped || this.disposed || !normalizeEpc(rawEpc)) return;
    this.seq += 1;
    const key = this.seq;
    if (isEpcAlreadyRead(rawEpc, this.known, this.sent)) {
      this.deps.onAdd({ key, code: rawEpc, tone: "warn", title: "Ya leído", detail: "Esta etiqueta ya está en el encuadre" });
      return;
    }
    this.deps.onAdd({ key, code: rawEpc, tone: "pending", title: "Enviando…" });
    this.sent.add(normalizeEpc(rawEpc));
    this.queue.push({ key, code: rawEpc });
    this.deps.onPending(this.queue.length + (this.running ? 1 : 0));
    void this.drain();
  }

  /** El panel se montó (otra vez, en el doble montaje de StrictMode). */
  activate(): void {
    this.disposed = false;
  }

  /** El panel se desmontó: no se manda nada más. */
  dispose(): void {
    this.disposed = true;
    this.queue = [];
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    let changed = false;
    try {
      while (this.queue.length > 0 && !this.disposed && !this.stopped) {
        const next = this.queue.shift()!;
        this.deps.onPending(this.queue.length + 1);
        try {
          const read = await this.deps.send(next.code);
          // La forma canónica que guardó el backend también cuenta como enviada.
          const canonical = normalizeEpc(read.codigo_tag);
          if (canonical) this.sent.add(canonical);
          changed = true;
          this.deps.onUpdate(next.key, readSuccessFeedback(read));
        } catch (error) {
          const { kind, message } = classifyReadError(error);
          this.deps.onUpdate(next.key, readErrorFeedback(kind, message));
          // Lo que no quedó guardado se puede volver a leer.
          if (kind !== "duplicate") this.sent.delete(normalizeEpc(next.code));
          // El backend ya lo tenía y el detalle no: otra sesión leyó. Se relee.
          if (kind === "duplicate") changed = true;
          if (kind === "not-pending" || kind === "not-found" || kind === "forbidden") {
            this.stopped = true;
            for (const dropped of this.queue) {
              this.sent.delete(normalizeEpc(dropped.code));
              this.deps.onUpdate(dropped.key, { tone: "error", title: "No se envió", detail: message });
            }
            this.queue = [];
            this.deps.onStop(message);
            changed = true; // relee para dejar de ofrecer la lectura
          }
        }
      }
    } finally {
      this.running = false;
      this.deps.onPending(0);
      if (changed && !this.disposed) this.deps.onDrained();
    }
  }
}
