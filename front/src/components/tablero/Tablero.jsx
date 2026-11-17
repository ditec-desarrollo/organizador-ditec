import { useMemo } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useDatos, useUsuario } from "../../context/contextos";
import { claseEstadoTarea } from "../../utils/estados";
import { puedeActualizarTarea } from "../../utils/permisos";
import TarjetaTarea from "./TarjetaTarea";

// Tablero Kanban: una columna por estado de tarea (las columnas salen del catálogo del back).
// Solo se pueden arrastrar las tarjetas que el usuario puede actualizar; el back vuelve a validarlo.
//   onMover(id_tarea, id_etarea, indice) -> lo resuelve hooks/useTareas.js
const Tablero = ({ tareas, onMover, mostrarProyecto = true }) => {
  const { usuario } = useUsuario();
  const { catalogos, abrirTarea } = useDatos();

  const columnas = useMemo(
    () =>
      catalogos.estadosTarea.map((estado) => ({
        ...estado,
        tareas: tareas.filter((tarea) => tarea.id_etarea === estado.id_etarea),
      })),
    [catalogos.estadosTarea, tareas],
  );

  const alSoltar = ({ draggableId, source, destination }) => {
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    onMover(Number(draggableId), Number(destination.droppableId), destination.index);
  };

  return (
    <DragDropContext onDragEnd={alSoltar}>
      <div className="org-tablero">
        {columnas.map((columna) => (
          <section key={columna.id_etarea} className={`org-columna ${claseEstadoTarea(columna.id_etarea)}`} aria-label={columna.nombre_etarea}>
            <header className="org-columna__cabecera">
              <span className="org-columna__marca" aria-hidden="true" />
              <h3 className="org-columna__titulo">{columna.nombre_etarea}</h3>
              <span className="org-columna__cantidad">{columna.tareas.length}</span>
            </header>

            <Droppable droppableId={String(columna.id_etarea)}>
              {(zona, estadoZona) => (
                <div
                  ref={zona.innerRef}
                  {...zona.droppableProps}
                  className={`org-columna__lista${estadoZona.isDraggingOver ? " org-columna__lista--sobre" : ""}`}
                >
                  {columna.tareas.map((tarea, indice) => {
                    const movible = puedeActualizarTarea(usuario, tarea);
                    return (
                      <Draggable key={tarea.id_tarea} draggableId={String(tarea.id_tarea)} index={indice} isDragDisabled={!movible}>
                        {(arrastre, estadoArrastre) => (
                          <TarjetaTarea
                            tarea={tarea}
                            mostrarProyecto={mostrarProyecto}
                            onAbrir={abrirTarea}
                            arrastre={arrastre}
                            arrastrando={estadoArrastre.isDragging}
                            fija={!movible}
                          />
                        )}
                      </Draggable>
                    );
                  })}
                  {zona.placeholder}
                  {columna.tareas.length === 0 && !estadoZona.isDraggingOver && <p className="org-columna__vacia">Sin tareas</p>}
                </div>
              )}
            </Droppable>
          </section>
        ))}
      </div>
    </DragDropContext>
  );
};

export default Tablero;
