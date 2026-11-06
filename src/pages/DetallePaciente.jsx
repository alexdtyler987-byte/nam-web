import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Silueta from "./Silueta";
import DietaSemanal from "./DietaSemanal";
import TiraSemanal from "./TiraSemanal";
import HistoriaClinica from "./HistoriaClinica";
import EvolucionPeso from "./EvolucionPeso";
import CalendarioMes from "./CalendarioMes";
import GastoEnergetico from "./GastoEnergetico";
import Diagnosticos from "./Diagnosticos";
import FotoComida from "./FotoComida";
import EstadoVacio from "./EstadoVacio";
import Pestanas from "./Pestanas";
import RegistrarMedicion from "./RegistrarMedicion";
import {
  calcularIMC,
  capitalizar,
  categoriaIMC,
  claseChip,
  colorAvatar,
  colorCategoria,
  edadDesde,
  formatoFecha,
  horaLima,
  iniciales,
  nombrePaciente,
} from "./utilidades";

const TIPOS_COMIDA = ["desayuno", "almuerzo", "cena"];

const PESTANAS = [
  { id: "resumen", label: "Resumen" },
  { id: "historia", label: "Historia clínica" },
  { id: "plan", label: "Gasto y plan" },
  { id: "seguimiento", label: "Seguimiento" },
];
const IDS_PESTANAS = PESTANAS.map((p) => p.id);

function DetallePaciente() {
  const { id } = useParams();
  const { pacientes, setPacientes, comidasHoy, cargando, refrescarPlanes } =
    useOutletContext();
  const paciente = pacientes.find((p) => String(p.id) === id);
  const planRef = useRef(null);
  const panelesRef = useRef(null);
  const botonMedicionRef = useRef(null);

  // La pestaña activa vive en la dirección (?tab=seguimiento): al recargar o compartir el enlace se conserva.
  const [parametros, setParametros] = useSearchParams();
  const pedida = parametros.get("tab");
  const pestana = IDS_PESTANAS.includes(pedida) ? pedida : "resumen";

  const [conPlan, setConPlan] = useState(null);
  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState(false);
  const [versionMedidas, setVersionMedidas] = useState(0);
  const [versionFicha, setVersionFicha] = useState(0);
  const [mostrarMedicion, setMostrarMedicion] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    setEditando(false);
    setMostrarMedicion(false);
    setAviso("");
  }, [paciente?.id]);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(""), 5000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => {
    if (!paciente) return;
    let cancelado = false;

    supabase
      .from("DIETA-PACIENTE")
      .select("id", { count: "exact", head: true })
      .eq("paciente_id", paciente.id)
      .then(({ count }) => {
        if (!cancelado) setConPlan((count ?? 0) > 0);
      });

    return () => {
      cancelado = true;
    };
  }, [paciente?.id, version]);

  function cambiarPestana(nueva) {
    setParametros(nueva === "resumen" ? {} : { tab: nueva }, { replace: true });
    // Si la persona había bajado en la página, vuelve al inicio del contenido de la nueva pestaña.
    setTimeout(() => {
      const paneles = panelesRef.current;
      if (paneles && paneles.getBoundingClientRect().top < 72) {
        paneles.scrollIntoView({ block: "start" });
      }
    }, 0);
  }

  function irAlPlan() {
    planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function abrirEditor() {
    cambiarPestana("plan");
    setEditando(true);
    setTimeout(irAlPlan, 80);
  }

  function cerrarEditor() {
    setEditando(false);
    setVersion((v) => v + 1);
    refrescarPlanes();
  }

  // Cuando se guarda una medición o cambia el diagnóstico principal, la ficha se actualiza sin recargar.
  function actualizarPaciente(actualizado) {
    setPacientes((lista) =>
      lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
    );
  }

  function cerrarMedicion() {
    setMostrarMedicion(false);
    setTimeout(() => botonMedicionRef.current?.focus(), 0);
  }

  function medicionGuardada({ historial }) {
    if (historial) setVersionMedidas((v) => v + 1);
    setAviso(
      historial
        ? "Medición registrada en el historial."
        : "Datos guardados correctamente.",
    );
    cerrarMedicion();
  }

  if (cargando) {
    return (
      <div>
        <div className="esqueleto esq-detalle" />
        <div className="esqueleto esq-tira" />
      </div>
    );
  }

  if (!paciente) {
    return (
      <div>
        <EstadoVacio fruta="cebolla" titulo="No se encontró este paciente">
          Puede que el enlace no sea correcto o que el paciente ya no esté en tu lista.
        </EstadoVacio>
        <Link to="/panel/pacientes" className="volver" style={{ marginTop: "12px" }}>
          ‹ Volver a pacientes
        </Link>
      </div>
    );
  }

  const imc = calcularIMC(paciente["Peso actual"], paciente.Altura);
  const categoria = categoriaIMC(imc);
  const edad = edadDesde(paciente.fecha_nacimiento);
  const subtitulo = [
    paciente.DNI ? `DNI ${paciente.DNI}` : null,
    edad != null ? `${edad} años` : null,
    paciente.sexo,
  ]
    .filter(Boolean)
    .join(" · ");

  const comidasDelPaciente = comidasHoy.filter(
    (c) => c.paciente_id === paciente.id,
  );
  const completadasHoy = comidasDelPaciente
    .filter((c) => c.completado)
    .map((c) => String(c.tipo_comida).toLowerCase());

  // Una fila por comida de hoy (si hubiera repetidas, queda la más reciente).
  const filasHoy = {};
  comidasDelPaciente
    .filter((c) => c.completado)
    .forEach((c) => {
      const tipo = String(c.tipo_comida).toLowerCase();
      const previa = filasHoy[tipo];
      if (!previa || new Date(c.hora_completado) > new Date(previa.hora_completado)) {
        filasHoy[tipo] = c;
      }
    });

  return (
    <div className="detalle">
      <Link to="/panel" className="volver">
        ‹ Volver a pacientes
      </Link>

      <header className="detalle-cabecera">
        <span
          className="avatar avatar-grande"
          style={{ background: colorAvatar(paciente.sexo) }}
        >
          {iniciales(nombrePaciente(paciente))}
        </span>
        <div>
          <h1>{nombrePaciente(paciente)}</h1>
          <p className="detalle-sub">{subtitulo}</p>
        </div>
        {conPlan !== null ? (
          <span className={conPlan ? "badge badge-ok" : "badge"}>
            {conPlan ? "Con plan" : "Sin plan"}
          </span>
        ) : null}
        <button type="button" className="btn-secundario" onClick={abrirEditor}>
          Editar plan
        </button>
      </header>

      <Pestanas
        items={PESTANAS}
        activa={pestana}
        onCambiar={cambiarPestana}
        etiqueta="Secciones de la ficha del paciente"
      />

      <div className="tab-paneles" ref={panelesRef}>
        {/* ---------- Resumen ---------- */}
        <div
          role="tabpanel"
          id="panel-resumen"
          aria-labelledby="pestana-resumen"
          hidden={pestana !== "resumen"}
          className="tab-panel"
        >
          <div className="detalle-grid">
            <section className="tarjeta tarjeta-silueta">
              <Silueta sexo={paciente.sexo} color={colorCategoria(imc)} />
            </section>

            <section className="tarjeta">
              <div className="tarjeta-encabezado">
                <h2>Datos antropométricos</h2>
                <button
                  ref={botonMedicionRef}
                  type="button"
                  className="registro-boton"
                  onClick={() => setMostrarMedicion(true)}
                >
                  + Registrar nueva medición
                </button>
              </div>

              <div className="medidas">
                <div className="medida">
                  <span>Peso (kg)</span>
                  <strong>{paciente["Peso actual"] || "—"}</strong>
                </div>
                <div className="medida">
                  <span>Talla (m)</span>
                  <strong>{paciente.Altura || "—"}</strong>
                </div>
                <div className="medida medida-imc">
                  <span>IMC</span>
                  <strong>{imc != null ? imc.toFixed(1) : "—"}</strong>
                  {imc != null ? (
                    <span className={claseChip(categoria)}>{categoria}</span>
                  ) : null}
                </div>
              </div>

              <h2 style={{ marginTop: "20px" }}>Medidas adicionales</h2>
              <div className="medidas">
                <div className="medida">
                  <span>Cintura</span>
                  <strong>
                    {paciente.cintura != null ? `${paciente.cintura} cm` : "—"}
                  </strong>
                </div>
                <div className="medida">
                  <span>Cadera</span>
                  <strong>
                    {paciente.cadera != null ? `${paciente.cadera} cm` : "—"}
                  </strong>
                </div>
              </div>

              {aviso ? (
                <p className="aviso-guardado" role="status">
                  {aviso}
                </p>
              ) : null}
              <p className="actualizacion">
                Última actualización: {formatoFecha(paciente.ultima_actualizacion)}
              </p>
            </section>
          </div>

          <Diagnosticos
            paciente={paciente}
            onPacienteActualizado={actualizarPaciente}
          />

          <section className="tarjeta">
            <div className="tarjeta-encabezado">
              <h2>Comidas de hoy</h2>
              <button
                type="button"
                className="btn-secundario"
                onClick={() => cambiarPestana("plan")}
              >
                Ver plan semanal
              </button>
            </div>
            <ul className="comidas comidas-fotos">
              {TIPOS_COMIDA.map((tipo) => {
                const fila = filasHoy[tipo];

                return (
                  <li key={tipo} className={fila ? "comida-ok" : "comida-pendiente"}>
                    <span>
                      {capitalizar(tipo)} ·{" "}
                      {fila ? `Listo · ${horaLima(fila.hora_completado)}` : "Pendiente"}
                    </span>

                    {fila && fila.foto_path ? (
                      <FotoComida
                        path={fila.foto_path}
                        titulo={`${capitalizar(tipo)} de ${nombrePaciente(paciente)}`}
                      />
                    ) : null}

                    {fila && !fila.foto_path ? (
                      <small>
                        {fila.foto_borrada_en ? "Foto eliminada" : "Confirmada sin foto"}
                      </small>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* ---------- Historia clínica ---------- */}
        <div
          role="tabpanel"
          id="panel-historia"
          aria-labelledby="pestana-historia"
          hidden={pestana !== "historia"}
          className="tab-panel"
        >
          <HistoriaClinica
            paciente={paciente}
            onGuardada={() => setVersionFicha((v) => v + 1)}
          />
        </div>

        {/* ---------- Gasto y plan ---------- */}
        <div
          role="tabpanel"
          id="panel-plan"
          aria-labelledby="pestana-plan"
          hidden={pestana !== "plan"}
          className="tab-panel"
        >
          <GastoEnergetico paciente={paciente} version={versionFicha} />

          <section className="tarjeta" ref={planRef}>
            <div className="plan-cabecera">
              <h2>Plan semanal</h2>
              <div className="plan-acciones">
                {editando ? (
                  <button
                    type="button"
                    className="registro-boton"
                    onClick={cerrarEditor}
                  >
                    Listo
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={abrirEditor}
                  >
                    Editar plan
                  </button>
                )}
              </div>
            </div>

            {editando ? (
              <DietaSemanal paciente={paciente} />
            ) : (
              <TiraSemanal paciente={paciente} completadasHoy={completadasHoy} />
            )}
          </section>
        </div>

        {/* ---------- Seguimiento ---------- */}
        <div
          role="tabpanel"
          id="panel-seguimiento"
          aria-labelledby="pestana-seguimiento"
          hidden={pestana !== "seguimiento"}
          className="tab-panel"
        >
          <CalendarioMes
            paciente={paciente}
            refresco={completadasHoy.length}
            versionPlan={version}
          />

          <EvolucionPeso paciente={paciente} version={versionMedidas} />
        </div>
      </div>

      {mostrarMedicion ? (
        <RegistrarMedicion
          paciente={paciente}
          onPacienteGuardado={actualizarPaciente}
          onExito={medicionGuardada}
          onCerrar={cerrarMedicion}
        />
      ) : null}
    </div>
  );
}

export default DetallePaciente;