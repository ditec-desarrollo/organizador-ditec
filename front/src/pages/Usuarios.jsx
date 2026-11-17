import { useState } from "react";
import { Button, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EncabezadoPagina from "../common/EncabezadoPagina";
import TablaEsqueleto from "../components/Esqueletos/TablaEsqueleto";
import { CampoTexto } from "../components/ui/Campos";
import { ChipNeutro } from "../components/ui/Chips";
import { Consulta, EstadoVacio } from "../components/ui/Estados";
import FormularioUsuario from "../components/usuarios/FormularioUsuario";
import { useDatos } from "../context/contextos";
import { useConsulta } from "../hooks/useConsulta";
import { usuariosApi } from "../services/api";
import { mostrarFecha } from "../utils/fechas";

const coincide = (usuario, texto) =>
  `${usuario.nombre_persona} ${usuario.apellido_persona} ${usuario.documento_persona} ${usuario.nombre_tusuario}`
    .toLowerCase()
    .includes(texto.toLowerCase());

// Gestión de usuarios (solo administradores): quién puede entrar al Organizador y con qué rol.
const Usuarios = () => {
  const { refrescar } = useDatos();
  const consulta = useConsulta(() => usuariosApi.listar(), []);
  const [filtro, setFiltro] = useState("");
  // null = cerrado · "nuevo" = alta · objeto = edición de ese usuario
  const [formulario, setFormulario] = useState(null);

  return (
    <main className="org-pagina">
      <EncabezadoPagina
        sup="Administración"
        titulo="Usuarios"
        subtitulo="Las personas inician sesión con su cuenta de Ciudad Digital. Acá se define quién entra al Organizador y con qué rol."
        acciones={
          <Button variant="contained" startIcon={<PersonAddAltRoundedIcon />} onClick={() => setFormulario("nuevo")}>
            Nuevo usuario
          </Button>
        }
      />

      <div className="cd-superficie org-filtros" role="search">
        <CampoTexto
          etiqueta="Buscar"
          placeholder="Nombre, CUIL o rol"
          valor={filtro}
          onChange={setFiltro}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </div>

      <Consulta consulta={consulta} esqueleto={<TablaEsqueleto />}>
        {(usuarios) => {
          const visibles = usuarios.filter((usuario) => coincide(usuario, filtro.trim()));
          if (visibles.length === 0) {
            return (
              <div className="cd-superficie">
                <EstadoVacio titulo="Ningún usuario coincide con la búsqueda" />
              </div>
            );
          }
          return (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>CUIL</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Alta</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibles.map((usuario) => (
                    <TableRow key={usuario.id_usuario}>
                      <TableCell>
                        <span className="org-celda-principal">
                          {usuario.nombre_persona} {usuario.apellido_persona}
                        </span>
                        {usuario.email_persona && <span className="org-celda-secundaria">{usuario.email_persona}</span>}
                      </TableCell>
                      <TableCell>{usuario.documento_persona}</TableCell>
                      <TableCell>
                        <ChipNeutro>{usuario.nombre_tusuario}</ChipNeutro>
                      </TableCell>
                      <TableCell>
                        <span className={`org-chip ${usuario.habilita === 1 ? "org-color--verde" : "org-color--gris"}`}>
                          {usuario.habilita === 1 ? "Habilitado" : "Deshabilitado"}
                        </span>
                      </TableCell>
                      <TableCell>{mostrarFecha(usuario.fecha_alta)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar rol y estado">
                          <IconButton
                            size="small"
                            onClick={() => setFormulario(usuario)}
                            aria-label={`Editar a ${usuario.nombre_persona} ${usuario.apellido_persona}`}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </Consulta>

      {formulario && (
        <FormularioUsuario
          usuario={formulario === "nuevo" ? null : formulario}
          onCerrar={() => setFormulario(null)}
          onGuardado={() => {
            setFormulario(null);
            refrescar();
          }}
        />
      )}
    </main>
  );
};

export default Usuarios;
