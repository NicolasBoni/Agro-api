// src/routes/estufa.js

const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

/**
 * POST /estufa
 * Cria um novo registro na tabela Estufa
 */
router.post('/', async (req, res) => {
  const { nomeEstufa, temperatura, umidade } = req.body;

  // Validação: Todos os campos devem ser fornecidos
  if (!nomeEstufa || temperatura === undefined || umidade === undefined) {
    return res.status(400).json({ error: 'Preencha todos os campos: nomeEstufa, temperatura e umidade.' });
  }

  try {
    // Cria o registro; datahora é gerado automaticamente pelo Prisma
    const novaEstufa = await prisma.estufa.create({
      data: {
        nomeEstufa,
        temperatura,
        umidade
      }
    });

    return res.status(201).json(novaEstufa);
  } catch (error) {
    console.error('Erro ao criar Estufa:', error);
    return res.status(500).json({ error: 'Erro interno ao criar a Estufa.' });
  }
});

/**
 * GET /estufa
 * Retorna todos os registros da tabela Estufa
 */
router.get('/', async (req, res) => {
  try {
    const estufas = await prisma.estufa.findMany();
    return res.json(estufas);
  } catch (error) {
    console.error('Erro ao listar Estufas:', error);
    return res.status(500).json({ error: 'Erro ao listar Estufas.' });
  }
});

/**
 * DELETE /estufa
 * Remove todos os registros DA TABELA ESTUFA e reseta o ID para começar em 1.
 */
router.delete('/', async (req, res) => {
  try {
    // 1) Apaga todos os registros da tabela Estufa
    await prisma.estufa.deleteMany({});

    // 2) Reseta a sequência de IDs (apenas para SQLite).
    //
    // Se você estiver usando SQLite no seu schema (arquivo dev.db),
    // o Prisma cria uma entrada em sqlite_sequence para cada tabela
    // que usa @default(autoincrement()). Removendo essa linha,
    // a próxima inserção de ID será 1 novamente.
    //
    // IMPORTANTE: se você mudar para outro banco (PostgreSQL, MySQL etc.),
    // o comando SQL precisa ser adaptado (por exemplo, `ALTER SEQUENCE ... RESTART`).
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name = 'Estufa';`;

    return res.json({ message: 'Todos os registros de Estufa foram removidos e ID resetado para 1.' });
  } catch (error) {
    console.error('Erro ao apagar Estufas ou resetar sequência:', error);
    return res.status(500).json({ error: 'Falha interna ao apagar registros ou resetar IDs.' });
  }
});

module.exports = router;
