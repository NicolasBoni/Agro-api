// src/index.js

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5432;

// ─── IMPORTS PARA API (Rotas) ───────────────────────────────────────────────
const estufaRouter = require('./routes/estufa');

// ─── IMPORTS PARA O PRISMA (Inserção no Banco) ──────────────────────────────
const prisma = require('./prismaClient');

// ─── IMPORTS PARA LER A PORTA SERIAL (Arduino) ───────────────────────────────
// A partir da v10 do serialport, fazemos a desestruturação assim:
const { SerialPort }      = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// ─── MIDDLEWARES GERAIS ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json()); // Parseia JSON no body das requisições

// ─── MONTAGEM DAS ROTAS HTTP DA API ─────────────────────────────────────────
app.use('/estufa', estufaRouter);

app.get('/', (req, res) => {
  res.send('API de Estufa unificada funcionando');
});

// Rotas não encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ─── CONFIGURAÇÃO DA PORTA SERIAL (ARDUINO) ─────────────────────────────────

// 1) Substitua este valor pela porta serial do seu Arduino:
//    Exemplo Windows: "COM3", Linux/Mac: "/dev/ttyACM0" ou "/dev/ttyUSB0"
const portPath = "COM3";  

// 2) Cria a instância do SerialPort a 9600 bauds (igual ao baud do Arduino)
const arduinoPort = new SerialPort({ path: portPath, baudRate: 9600 });

// 3) Cria o parser de linhas (cada JSON do Arduino deve ter '\n' ao final)
const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

console.log(`[INFO] Aguardando dados do Arduino na porta serial ${portPath}...`);

// 4) Quando chegar uma linha JSON completa do Arduino, este callback é disparado:
parser.on('data', async (line) => {
  line = line.trim();
  if (!line) return;

  console.log(`[SERIAL] Recebido: ${line}`);

  let objeto;
  try {
    objeto = JSON.parse(line);
  } catch (err) {
    console.error(`[ERRO] JSON inválido: ${line}`);
    return;
  }

  // 5) Validação mínima dos campos
  if (
    typeof objeto.nomeEstufa !== 'string' ||
    typeof objeto.temperatura !== 'number' ||
    typeof objeto.umidade !== 'number'
  ) {
    console.error('[ERRO] JSON recebido não possui campos corretos (nomeEstufa, temperatura, umidade).');
    return;
  }

  // 6) Dados para inserir no banco (Prisma gerará datahora automaticamente)
  const dadosParaInserir = {
    nomeEstufa: objeto.nomeEstufa,
    temperatura: objeto.temperatura,
    umidade: objeto.umidade
    // Se quiser usar o datahora vindo do Arduino (timestamp), faça:
    // datahora: new Date(objeto.datahora)
  };

  // 7) Insere no banco com o Prisma
  try {
    const novoRegistro = await prisma.estufa.create({
      data: dadosParaInserir
    });
    console.log(`[DB] Inserido: ID=${novoRegistro.id} | nomeEstufa=${novoRegistro.nomeEstufa} | temp=${novoRegistro.temperatura} | umid=${novoRegistro.umidade} | datahora=${novoRegistro.datahora.toISOString()}`);
  } catch (err) {
    console.error('[DB] Erro ao inserir no banco:', err.message);
  }
});

// Se houver algum erro na porta serial
arduinoPort.on('error', (err) => {
  console.error(`[ERRO PORTA SERIAL] ${err.message}`);
});

// ─── INICIO DO SERVIDOR HTTP ─────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`API rodando na porta:${port}`);
});
