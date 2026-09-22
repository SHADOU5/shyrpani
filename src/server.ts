import express from "express";
import { rutaChat } from "./routes/chat";
import { registroSkills } from "./core/skillRegistry";

const app = express();
app.use(express.json());

app.use("/api/chat", rutaChat);

app.get("/api/skills", (_req, res) => {
  res.json(registroSkills.listar().map((s) => ({ nombre: s.nombre, descripcion: s.descripcion })));
});

const PUERTO = process.env.PORT || 3001;

async function iniciar() {
  await registroSkills.cargarTodas();
  app.listen(PUERTO, () => {
    console.log(`Servidor Shyrpani escuchando en puerto ${PUERTO}`);
  });
}

iniciar();