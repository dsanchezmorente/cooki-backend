const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middleware/auth');

router.post('/', verificarToken, (req, res) => {

  const {
    nombre,
    imagen,
    calorias,
    grasas,
    azucares,
    ingredientes,
    pasos,
    alergenos
  } = req.body;

  const id_usuario = req.user.id;

  db.beginTransaction(err => {

    if (err) return res.status(500).json(err);

    const sqlReceta = `
      INSERT INTO receta
      (id_usuario, nombre, imagen, calorias, grasas, azucares, fecha_creacion)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(
      sqlReceta,
      [id_usuario, nombre, imagen, calorias, grasas, azucares],
      (err, result) => {

        if (err) {
          return db.rollback(() => res.status(500).json(err));
        }

        const id_receta = result.insertId;

        insertarIngredientes(id_receta);
      }
    );

  });


  function insertarIngredientes(id_receta) {

    if (!ingredientes || ingredientes.length === 0) {
      return insertarPasos(id_receta);
    }

    const sql = `
      INSERT INTO receta_ingrediente
      (id_receta, orden, cantidad, unidad, ingrediente)
      VALUES ?
    `;

    const values = ingredientes.map(i => [
      id_receta,
      i.orden,
      i.cantidad,
      i.unidad,
      i.ingrediente
    ]);

    db.query(sql, [values], (err) => {

      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }

      insertarPasos(id_receta);
    });
  }


  function insertarPasos(id_receta) {

    if (!pasos || pasos.length === 0) {
      return insertarAlergenos(id_receta);
    }

    const sql = `
      INSERT INTO paso
      (id_receta, numero, descripcion)
      VALUES ?
    `;

    const values = pasos.map(p => [
      id_receta,
      p.numero,
      p.descripcion
    ]);

    db.query(sql, [values], (err) => {

      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }

      insertarAlergenos(id_receta);
    });
  }


  function insertarAlergenos(id_receta) {

    if (!alergenos || alergenos.length === 0) {
      return finalizar();
    }

    const sql = `
      INSERT INTO receta_alergeno
      (id_receta, id_alergeno)
      VALUES ?
    `;

    const values = alergenos.map(a => [
      id_receta,
      a
    ]);

    db.query(sql, [values], (err) => {

      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }

      finalizar();
    });
  }


  function finalizar() {

    db.commit(err => {

      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }

      res.status(201).json({
        message: "Receta creada correctamente"
      });

    });

  }

});

router.get('/', verificarToken, (req, res) => {

  db.query("SELECT * FROM RECETA", (err, results) => {
    res.json(results);
  });

});

module.exports = router;