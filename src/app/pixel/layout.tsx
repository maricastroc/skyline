import type { Metadata } from "next";
import { Doto, Geist, Geist_Mono, Instrument_Sans, Instrument_Serif, Silkscreen } from "next/font/google";
import "./pixel.css";
import "./skyline.css";
import "./page-map.css";

const pixel = Silkscreen({ variable: "--font-pixel", subsets: ["latin"], weight: ["400", "700"] });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instSans = Instrument_Sans({ variable: "--font-inst-sans", subsets: ["latin"] });
const instSerif = Instrument_Serif({ variable: "--font-inst-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], weight: ["500", "700", "900"] });

export const metadata: Metadata = {
  title: "Skyline",
  description: "Any website, rebuilt as a city you can walk into.",
};

export default function PixelLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pixel-root ${pixel.variable} ${geist.variable} ${geistMono.variable} ${instSans.variable} ${instSerif.variable} ${doto.variable}`}>{children}</div>;
}
