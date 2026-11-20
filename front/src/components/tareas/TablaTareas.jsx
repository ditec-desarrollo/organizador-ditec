import { useState } from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from "@mui/material";
import { useDatos } from "../../context/contextos";
import { alertaVencimiento, mostrarFecha, textoVencimiento } from "../../utils/fechas";
import BarraAvance from "../ui/BarraAvance";
import { ChipEstadoTarea, ChipPrioridad } from "../ui/Chips";
import { EstadoVacio } from "../ui/Estados";
import ResponsablesTarea from "../ui/ResponsablesTarea";

const CLASE_VENCIMIENTO = { vencida: "org-vencida", proxima: "org-proxima" };

// Lista de tareas en tabla. Al tocar una fila se abre el detalle.
//   fecha -> "vencimiento" (por defecto) o "finalizacion": qué fecha muestra la última columna
//   vacio -> texto cuando no hay tareas
const TablaTareas = ({ tareas, mostrarProyecto = true, fecha = "vencimiento", vacio = "Probá cambiando los filtros." }) => {
  const { abrirTarea } = useDatos();
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(10);

  if (tareas.length === 0) {
    return (
      <div className="cd-superficie">
        <EstadoVacio titulo="No hay tareas" texto={vacio} />
      </div>
    );
  }

  // Si los filtros dejaron menos filas que la página actual, se muestra la última que existe.
  const ultimaPagina = Math.max(0, Math.ceil(tareas.length / porPagina) - 1);
  const paginaVisible = Math.min(pagina, ultimaPagina);
  const visibles = tareas.slice(paginaVisible * porPagina, (paginaVisible + 1) * porPagina);

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Tarea</TableCell>
            <TableCell>Responsables</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Prioridad</TableCell>
            <TableCell sx={{ minWidth: 150 }}>Avance</TableCell>
            <TableCell>{fecha === "finalizacion" ? "Finalizada" : "Vencimiento"}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((tarea) => (
            <TableRow
              key={tarea.id_tarea}
              hover
              className="org-fila--accion"
              tabIndex={0}
              onClick={() => abrirTarea(tarea.id_tarea)}
              onKeyDown={(evento) => evento.key === "Enter" && abrirTarea(tarea.id_tarea)}
            >
              <TableCell sx={{ minWidth: 220 }}>
                <span className="org-celda-principal">{tarea.titulo}</span>
                {mostrarProyecto && <span className="org-celda-secundaria">{tarea.nombre_proyecto}</span>}
              </TableCell>
              <TableCell>
                <ResponsablesTarea responsables={tarea.responsables} />
              </TableCell>
              <TableCell>
                <ChipEstadoTarea id={tarea.id_etarea} nombre={tarea.nombre_etarea} />
              </TableCell>
              <TableCell>
                <ChipPrioridad id={tarea.id_prioridad} nombre={tarea.nombre_prioridad} />
              </TableCell>
              <TableCell>
                <BarraAvance valor={tarea.porcentaje_avance} />
              </TableCell>
              {fecha === "finalizacion" ? (
                <TableCell sx={{ whiteSpace: "nowrap" }}>{mostrarFecha(tarea.fecha_finalizacion)}</TableCell>
              ) : (
                <TableCell className={CLASE_VENCIMIENTO[alertaVencimiento(tarea)] ?? ""} sx={{ whiteSpace: "nowrap" }}>
                  {textoVencimiento(tarea)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={tareas.length}
        page={paginaVisible}
        onPageChange={(_, nueva) => setPagina(nueva)}
        rowsPerPage={porPagina}
        onRowsPerPageChange={(evento) => {
          setPorPagina(Number(evento.target.value));
          setPagina(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Filas por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </TableContainer>
  );
};

export default TablaTareas;
