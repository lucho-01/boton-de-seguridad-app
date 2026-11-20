/**
 * Controlador del flujo SMS de M10.
 * Coordina ajustes, contactos y el sensor sin que la vista acceda a SQL.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AjustesRepository } from "@/repositories/ajustes";
import { AjustesRepositorySqlite } from "@/repositories/ajustes";
import type { ContactosRepository } from "@/repositories/contactos";
import { ContactosRepositorySqlite } from "@/repositories/contactos";
import { componerMensajeSms } from "@/services/mensaje";
import { valoresPorDefecto } from "@/services/ajustes";
import { useClipboard, type ClipboardSensor } from "@/sensors/useClipboard";
import { useSms, type SmsSensor } from "@/sensors/useSms";

export interface DatosMensajeSmsContexto {
  activo: boolean;
  lat: number | null;
  lng: number | null;
  bateriaPct: number | null;
}

export interface SmsController {
  disponible: boolean;
  mensaje: string;
  longitudMensaje: number;
  tieneUbicacion: boolean;
  puedeAbrir: boolean;
  puedeCopiar: boolean;
  aviso: string | null;
  avisoCopia: string | null;
  abrirRedactor(): Promise<boolean>;
  copiarMensaje(): Promise<boolean>;
}

export interface SmsRepositories {
  contactos?: ContactosRepository;
  ajustes?: AjustesRepository;
  sensor?: SmsSensor;
  portapapeles?: ClipboardSensor;
}

function resolverAviso(
  activo: boolean,
  sinDestinatarios: boolean,
  smsDisponible: boolean,
  tieneUbicacion: boolean,
  avisoApertura: string | null,
): string | null {
  if (!activo) {
    return null;
  }
  if (!smsDisponible) {
    return "El SMS no está disponible en este dispositivo.";
  }
  if (sinDestinatarios) {
    return "Agrega al menos un contacto de confianza para enviar el mensaje.";
  }
  if (!tieneUbicacion) {
    return "No se pudo obtener la ubicación; el mensaje va sin mapa.";
  }
  return avisoApertura;
}

export function useSmsController(
  contexto: DatosMensajeSmsContexto,
  dependencies: SmsRepositories = {},
): SmsController {
  const sensorDelHook = useSms();
  const portapapelesDelHook = useClipboard();
  let sensor = sensorDelHook;
  let portapapeles = portapapelesDelHook;
  if (dependencies.sensor !== undefined) {
    sensor = dependencies.sensor;
  }
  if (dependencies.portapapeles !== undefined) {
    portapapeles = dependencies.portapapeles;
  }
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [mensajeBase, setMensajeBase] = useState(valoresPorDefecto().mensajeBase);
  const [avisoApertura, setAvisoApertura] = useState<string | null>(null);
  const [avisoCopia, setAvisoCopia] = useState<string | null>(null);

  useEffect(() => {
    const contactosRepo = dependencies.contactos ?? new ContactosRepositorySqlite();
    const ajustesRepo = dependencies.ajustes ?? new AjustesRepositorySqlite();
    void Promise.all([contactosRepo.listar(), ajustesRepo.obtenerClave("mensaje_base")])
      .then(([contactos, mensaje]) => {
        setDestinatarios(contactos.map((contacto) => contacto.telefono));
        if (mensaje !== null) {
          setMensajeBase(mensaje);
        }
      })
      .catch(() => {
        setDestinatarios([]);
      });
  }, [dependencies.contactos, dependencies.ajustes]);

  const compuesto = useMemo(
    () =>
      componerMensajeSms({
        mensajeBase,
        lat: contexto.lat,
        lng: contexto.lng,
        bateriaPct: contexto.bateriaPct,
      }),
    [mensajeBase, contexto.lat, contexto.lng, contexto.bateriaPct],
  );

  const puedeAbrir =
    contexto.activo &&
    sensor.disponible &&
    destinatarios.length > 0 &&
    compuesto.mensaje.length > 0;
  const puedeCopiar = contexto.activo && !sensor.disponible && compuesto.mensaje.length > 0;

  const aviso = resolverAviso(
    contexto.activo,
    destinatarios.length === 0,
    sensor.disponible,
    compuesto.tieneUbicacion,
    avisoApertura,
  );

  const abrirRedactor = useCallback(async (): Promise<boolean> => {
    if (!puedeAbrir) {
      return false;
    }
    setAvisoApertura(null);
    const abierto = await sensor.abrirRedactor(destinatarios, compuesto.mensaje);
    if (!abierto) {
      setAvisoApertura("No se pudo abrir el redactor de SMS.");
      return false;
    }
    return true;
  }, [puedeAbrir, sensor, destinatarios, compuesto.mensaje]);

  const copiarMensaje = useCallback(async (): Promise<boolean> => {
    if (!puedeCopiar) {
      return false;
    }
    const copiado = await portapapeles.copiar(compuesto.mensaje);
    if (copiado) {
      setAvisoCopia("Mensaje copiado. Puedes pegarlo en tu aplicación de mensajería.");
      return true;
    }
    setAvisoCopia("No se pudo copiar el mensaje. Selecciónalo y cópialo manualmente.");
    return false;
  }, [puedeCopiar, portapapeles, compuesto.mensaje]);

  return {
    disponible: sensor.disponible,
    mensaje: compuesto.mensaje,
    longitudMensaje: compuesto.longitud,
    tieneUbicacion: compuesto.tieneUbicacion,
    puedeAbrir,
    puedeCopiar,
    aviso,
    avisoCopia,
    abrirRedactor,
    copiarMensaje,
  };
}
