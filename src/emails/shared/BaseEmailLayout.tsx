import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

type BaseEmailLayoutProps = {
  previewText: string;
  headingText: ReactNode;
  descriptionText: ReactNode;
  footerText: string;
  children: ReactNode;
};

/**
 * Chrome compartido, byte-idéntico, entre `QuoteEmail`, `PurchaseOrderEmail` e
 * `InvoiceEmail` — encabezado oscuro, contenedor y pie de página. Cada
 * template solo aporta su contenido único (las `EmailCard` intermedias) vía
 * `children`, igual que `BasePdfStyles`/`BasePdfColors` en el lado PDF.
 */
export const BaseEmailLayout = ({
  previewText,
  headingText,
  descriptionText,
  footerText,
  children,
}: BaseEmailLayoutProps) => (
  <Html lang="es">
    <Tailwind>
      <Head />
      <Preview>{previewText}</Preview>
      <Body className="m-0 bg-slate-100 py-8 font-sans text-slate-900">
        <Container className="mx-auto max-w-170 rounded-3xl bg-white px-8 py-10">
          <Section className="rounded-[20px] bg-slate-950 px-6 py-5 text-white">
            <Text className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              ERP Lazzar
            </Text>
            <Heading className="m-0 mt-3 text-[28px] font-semibold leading-[1.2] text-white">
              {headingText}
            </Heading>
            <Text className="m-0 mt-2 text-sm leading-6 text-slate-300">{descriptionText}</Text>
          </Section>

          {children}

          <Hr className="my-8 border-slate-200" />

          <Text className="m-0 text-xs leading-5 text-slate-500">{footerText}</Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

type EmailCardProps = {
  title: string;
  children: ReactNode;
};

/** Tarjeta de sección repetida dentro de `BaseEmailLayout` (Resumen, Totales, etc.). */
export const EmailCard = ({ title, children }: EmailCardProps) => (
  <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
    <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
      {title}
    </Heading>
    {children}
  </Section>
);
