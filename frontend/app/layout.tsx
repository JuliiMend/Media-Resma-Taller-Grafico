import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "../src/index.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Media Resma · Gestión",
  description:
    "Panel de gestión de Media Resma Taller Gráfico: pedidos, clientes, insumos, productos, gastos y tareas.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable} suppressHydrationWarning>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
