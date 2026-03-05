import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { CustomerItem } from "../interfaces/customer.interface";

interface CustomerState {
  customers: CustomerItem[];
  setCustomers: (customers: CustomerItem[]) => void;
  addCustomer: (customer: CustomerItem) => void;
  updateCustomer: (customer: CustomerItem) => void;
}

const initialCustomers: CustomerItem[] = [
  {
    razonSocial: "Grupo Comercial Alfa",
    contacto: "María González",
    telefono: "+52 81 4455 1200",
    correo: "maria.gonzalez@alfa.com.mx",
    ultimaCompra: "18 Feb 2026",
    ultimoPedido: "PED-2408",
    vendedor: "Laura Pérez",
    orderProfile: {
      clienteNombre: "María González",
      razonSocial: "Grupo Comercial Alfa",
      rfc: "GCA920101AA1",
      regimenFiscal: "601",
      direccionFiscal: "Av. Constitución 1200",
      coloniaFiscal: "Centro",
      codigoPostalFiscal: "64000",
      ciudadFiscal: "Monterrey",
      estadoFiscal: "Nuevo León",
      giroEmpresa: "Textiles y confección",
      destinatario: "Almacén Central Alfa",
      empresaEnvio: "Grupo Comercial Alfa",
      telefonoEnvio: "+52 81 4400 9988",
      celularEnvio: "+52 81 9901 1122",
      direccionEnvio: "Av. Constitución 1200, Bodega 3",
      coloniaEnvio: "Centro",
      codigoPostalEnvio: "64000",
      ciudadEnvio: "Monterrey",
      estadoEnvio: "Nuevo León",
      referenciasEnvio: "Entrada por Calle Reforma",
    },
  },
  {
    razonSocial: "Industrias del Bajío",
    contacto: "Carlos Rivas",
    telefono: "+52 477 331 7788",
    correo: "crivas@bajio.mx",
    ultimaCompra: "10 Feb 2026",
    ultimoPedido: "PED-2399",
    vendedor: "Diana Ortega",
    orderProfile: {
      clienteNombre: "Carlos Rivas",
      razonSocial: "Industrias del Bajío",
      rfc: "IBA870504BB2",
      regimenFiscal: "603",
      direccionFiscal: "Blvd. Aeropuerto 450",
      coloniaFiscal: "Industrial",
      codigoPostalFiscal: "37530",
      ciudadFiscal: "León",
      estadoFiscal: "Guanajuato",
      giroEmpresa: "Manufactura industrial",
      destinatario: "Recepción Bajío",
      empresaEnvio: "Industrias del Bajío",
      telefonoEnvio: "+52 477 335 2288",
      celularEnvio: "+52 477 112 3344",
      direccionEnvio: "Blvd. Aeropuerto 450, Nave 2",
      coloniaEnvio: "Industrial",
      codigoPostalEnvio: "37530",
      ciudadEnvio: "León",
      estadoEnvio: "Guanajuato",
      referenciasEnvio: "Andén 4",
    },
  },
  {
    razonSocial: "Distribuciones Pacífico",
    contacto: "Ricardo Salas",
    telefono: "+52 664 812 3344",
    correo: "rsalas@pacifico.mx",
    ultimaCompra: "18 Feb 2026",
    ultimoPedido: "PED-2402",
    vendedor: "Mario Silva",
    orderProfile: {
      clienteNombre: "Ricardo Salas",
      razonSocial: "Distribuciones Pacífico",
      rfc: "DPA780909CC3",
      regimenFiscal: "605",
      direccionFiscal: "Calz. Tecnológico 900",
      coloniaFiscal: "Industrial",
      codigoPostalFiscal: "22400",
      ciudadFiscal: "Tijuana",
      estadoFiscal: "Baja California",
      giroEmpresa: "Distribución y logística",
      destinatario: "Centro de Distribución Pacífico",
      empresaEnvio: "Distribuciones Pacífico",
      telefonoEnvio: "+52 664 812 3399",
      celularEnvio: "+52 664 220 7788",
      direccionEnvio: "Calz. Tecnológico 900, Patio B",
      coloniaEnvio: "Industrial",
      codigoPostalEnvio: "22400",
      ciudadEnvio: "Tijuana",
      estadoEnvio: "Baja California",
      referenciasEnvio: "Acceso por Puerta Norte",
    },
  },
];

export const useCustomerStore = create<CustomerState>()(
  devtools(
    persist(
      (set) => ({
        customers: initialCustomers,
        setCustomers: (customers) => set({ customers }),
        addCustomer: (customer) =>
          set((state) => ({ customers: [customer, ...state.customers] })),
        updateCustomer: (customer) =>
          set((state) => ({
            customers: state.customers.map((item) =>
              item.razonSocial === customer.razonSocial ? customer : item
            ),
          })),
      }),
      {
        name: "customer-store",
      }
    ),
    {
      name: "customer-store",
    }
  )
);
