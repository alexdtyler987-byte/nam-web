import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Silueta from "./Silueta";
import DietaSemanal from "./DietaSemanal";
import TiraSemanal from "./TiraSemanal";
import HistoriaClinica from "./HistoriaClinica";
import EvolucionPeso from "./EvolucionPeso";
import {
  calcularIMC,
  capitalizar,
  categoriaIMC,
  claseChip,
  colorAvatar,
  colorCategoria,
  edadDesde,
  formatoFecha,
  iniciales,
  nombrePaciente,
} from "./utilidades";

const TIPOS_COMIDA = ["desayuno", "almuerzo", "cena"];

function DetallePaciente() {
  const { id } = useParams();
  const { pacientes, setPacientes, comidasHoy, cargando, refrescarPlanes } =
    useOutletContext();
  const paciente = pacientes.find((p) => String(p.id) === id);
  const planRef = useRef(null);

  const [form, setForm] = useState({
    peso: "",
    altura: "",
    cintura: "",
    cadera: "",
    sexo: "",
    fechaNacimiento: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [conPlan, setConPlan] = useState(null);
  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState(false);
  const [versionMedidas, setVersionMedidas] = useState(0);

  useEffect(() => {
    if (!paciente) return;
    setForm({
      peso: paciente["Peso actual"] ?? "",
      altura: paciente.Altura ?? "",
      cintura: paciente.cintura ?? "",
      cadera: paciente.cadera ?? "",
      sexo: paciente.sexo ?? "",
      fechaNacimiento: paciente.fecha_nacimiento ?? "",
    });
    setMensaje("");
    setEditando(false);
  }, [paciente?.id]);

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

  function cambiar(campo, valor) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function irAlPlan() {
    planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function abrirEditor() {
    setEditando(true);
    setTimeout(irAlPlan, 60);
  }

  function cerrarEditor() {
    setEditando(false);
    setVersion((v) => v + 1);
    refrescarPlanes();
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("PACIENTES")
      .update({
        "Peso actual": String(form.peso).trim() || null,
        Altura: String(form.altura).trim() || null,
        IMC: calcularIMC(form.peso, form.altura),
        cintura: form.cintura === "" ? null : Number(form.cintura),
        cadera: form.cadera === "" ? null : Number(form.cadera),
        sexo: form.sexo || null,
        fecha_nacimiento: form.fechaNacimiento || null,
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq("id", paciente.id)
      .select();

    setGuardando(false);

    if (error) {
      setMensaje("Error al guardar: " + error.message);
      return;
    }

    const actualizado = data[0];
    setPacientes((lista) =>
      lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
    );
    const pesoNum = Number(form.peso);
    const alturaNum = Number(form.altura);

    if (pesoNum > 0 && alturaNum > 0) {
      const { error: errorHistorial } = await supabase
        .from("HISTORIAL-MEDIDAS")
        .upsert(
          {
            paciente_id: paciente.id,
            fecha: fechaHoy(),
            peso: pesoNum,
            altura: alturaNum,
            imc: calcularIMC(form.peso, form.altura),
            cintura: form.cintura === "" ? null : Number(form.cintura),
            cadera: form.cadera === "" ? null : Number(form.cadera),
          },
          { onConflict: "paciente_id,fecha" },
        );

      if (errorHistorial) {
        setMensaje(
          "Datos guardados, pero no se pudo registrar el historial: " +
            errorHistorial.message,
        );
        return;
      }

      setVersionMedidas((v) => v + 1);
    }

    setMensaje("Cambios guardados correctamente.");
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
        <p className="estado">No se encontró este paciente.</p>
        <Link to="/panel/pacientes" className="volver">
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

      <div className="detalle-grid">
        <section className="tarjeta tarjeta-silueta">
          <Silueta sexo={paciente.sexo} color={colorCategoria(imc)} />
        </section>

        <section className="tarjeta">
          <h2>Datos antropométricos</h2>
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
          <p className="actualizacion">
            Última actualización: {formatoFecha(paciente.ultima_actualizacion)}
          </p>
        </section>
      </div>

      <div className="acciones-detalle">
        <button type="button" className="btn-oscuro" onClick={irAlPlan}>
          Ver plan nutricional semanal
        </button>
      </div>

      <section className="tarjeta">
        <h2>Comidas de hoy</h2>
        <ul className="comidas">
          {TIPOS_COMIDA.map((tipo) => (
            <li
              key={tipo}
              className={
                completadasHoy.includes(tipo) ? "comida-ok" : "comida-pendiente"
              }
            >
              {capitalizar(tipo)} ·{" "}
              {completadasHoy.includes(tipo) ? "Listo" : "Pendiente"}
            </li>
          ))}
        </ul>
      </section>

      <form className="tarjeta" onSubmit={guardar}>
        <h2>Actualizar datos</h2>
        <div className="form-grid">
          <label className="campo">
            Peso (kg)
            <input
              type="number"
              step="0.1"
              value={form.peso}
              onChange={(e) => cambiar("peso", e.target.value)}
            />
          </label>
          <label className="campo">
            Talla (m)
            <input
              type="number"
              step="0.01"
              value={form.altura}
              onChange={(e) => cambiar("altura", e.target.value)}
            />
          </label>
          <label className="campo">
            Cintura (cm)
            <input
              type="number"
              step="0.1"
              value={form.cintura}
              onChange={(e) => cambiar("cintura", e.target.value)}
            />
          </label>
          <label className="campo">
            Cadera (cm)
            <input
              type="number"
              step="0.1"
              value={form.cadera}
              onChange={(e) => cambiar("cadera", e.target.value)}
            />
          </label>
          <label className="campo">
            Sexo
            <select
              value={form.sexo}
              onChange={(e) => cambiar("sexo", e.target.value)}
            >
              <option value="">Sin especificar</option>
              <option value="Mujer">Mujer</option>
              <option value="Hombre">Hombre</option>
            </select>
          </label>
          <label className="campo">
            Fecha de nacimiento
            <input
              type="date"
              value={form.fechaNacimiento}
              onChange={(e) => cambiar("fechaNacimiento", e.target.value)}
            />
          </label>
        </div>
        <div className="modal-acciones">
          {mensaje ? <span className="mensaje-guardado">{mensaje}</span> : null}
          <button type="submit" className="registro-boton" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      <EvolucionPeso paciente={paciente} version={versionMedidas} />

      <HistoriaClinica paciente={paciente} />
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
  );
}

export default DetallePaciente;
