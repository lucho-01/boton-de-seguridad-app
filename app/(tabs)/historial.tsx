import { Parrafo } from "@/components/Parrafo";
import { PantallaConAviso } from "@/components/PantallaConAviso";
import { TituloPantalla } from "@/components/TituloPantalla";

/** Pantalla de historial de alertas: llega en M12. */
export default function PantallaHistorial() {
  return (
    <PantallaConAviso conBarraDePestanas>
      <TituloPantalla>Historial</TituloPantalla>
      <Parrafo>El historial llegará en M12.</Parrafo>
    </PantallaConAviso>
  );
}
