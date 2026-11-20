import Svg, { Path } from "react-native-svg";
import type { ColorValue } from "react-native";

export type NombreIcono =
  | "escudo"
  | "ajustes"
  | "telefono"
  | "sacudida"
  | "ubicacion"
  | "alerta"
  | "contactos"
  | "historial"
  | "flecha"
  | "editar"
  | "eliminar"
  | "principal"
  | "sumar";

interface IconoProps {
  nombre: NombreIcono;
  tamano?: number;
  color?: ColorValue;
  grosor?: number;
}

const TRAZOS: Record<NombreIcono, string[]> = {
  escudo: ["M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z", "m9 12 2 2 4-4"],
  ajustes: [
    "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
    "m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z",
  ],
  telefono: [
    "M7 3.5h3l1.5 4-2 1.7a15 15 0 0 0 5.3 5.3l1.7-2 4 1.5v3a2 2 0 0 1-2.2 2A16.3 16.3 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z",
  ],
  sacudida: [
    "M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3",
    "m9 9 6 6m0-6-6 6",
    "M2 12h2m16 0h2M12 2v2m0 16v2",
  ],
  ubicacion: ["M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z", "M12 10a2.5 2.5 0 1 0 0 .01"],
  alerta: ["M12 3 2.5 20h19L12 3Z", "M12 9v4m0 3h.01"],
  contactos: [
    "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20",
    "M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M17 11a3.5 3.5 0 0 0 0-7m4 16v-1.5a4 4 0 0 0-3-3.9",
  ],
  historial: ["M3 12a9 9 0 1 0 2.6-6.4L3 8", "M3 3v5h5m4-1v5l3 2"],
  flecha: ["M5 12h14m-6-6 6 6-6 6"],
  editar: ["m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z", "m13.5 7 3.5 3.5"],
  eliminar: ["M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"],
  principal: ["m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"],
  sumar: ["M12 5v14m-7-7h14"],
};

export function Icono({ nombre, tamano = 24, color = "#0E1726", grosor = 1.8 }: IconoProps) {
  return (
    <Svg
      accessibilityElementsHidden
      importantForAccessibility="no"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
    >
      {TRAZOS[nombre].map((trazo, indice) => (
        <Path
          key={`${nombre}-${indice}`}
          d={trazo}
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
