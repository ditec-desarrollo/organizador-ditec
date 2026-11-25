import { createElement } from "react";
import HomeIcon from "@mui/icons-material/Home";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import ViewKanbanRoundedIcon from "@mui/icons-material/ViewKanbanRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import CommitRoundedIcon from "@mui/icons-material/CommitRounded";
import { esAdmin } from "../utils/permisos";

// Datos de marca de la app. En el header se ve: [isotipo] ORGANIZADOR
//                                                          Ditec
export const MARCA = {
  superior: "ORGANIZADOR",
  nombre: "Ditec",
  alt: "Municipalidad de San Miguel de Tucumán",
};

// Ítems del menú lateral.
//   ruta     -> a dónde navega
//   visible  -> opcional, (sesion) => boolean. `sesion` es lo que el Layout le pasa al NavBar.
export const ITEMS_MENU = [
  { ruta: "/home", texto: "Inicio", icono: createElement(HomeIcon) },
  { ruta: "/tv", texto: "Vista para TV", icono: createElement(TvRoundedIcon) },
  { ruta: "/proyectos", texto: "Proyectos", icono: createElement(FolderRoundedIcon) },
  { ruta: "/tablero", texto: "Tablero", icono: createElement(ViewKanbanRoundedIcon) },
  { ruta: "/tareas", texto: "Tareas", icono: createElement(ChecklistRoundedIcon) },
  { ruta: "/historial", texto: "Historial", icono: createElement(HistoryRoundedIcon) },
  { ruta: "/notificaciones", texto: "Notificaciones", icono: createElement(NotificationsRoundedIcon) },
  {
    ruta: "/usuarios",
    texto: "Usuarios",
    icono: createElement(GroupRoundedIcon),
    visible: (sesion) => esAdmin(sesion?.usuario),
  },
  {
    ruta: "/commits",
    texto: "Commits",
    icono: createElement(CommitRoundedIcon),
    visible: (sesion) => esAdmin(sesion?.usuario),
  },
];
