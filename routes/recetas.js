const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middleware/auth');

function parseInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.floor(numberValue);
}

router.post('/', verificarToken, (req, res) => {

  const {
    nombre,
    imagen,
    calorias,
    grasas,
    azucares,
    ingredientes,
    pasos,
    alergenos,
    categorias
  } = req.body;

  const caloriasInt = parseInteger(calorias);
  const grasasInt = parseInteger(grasas);
  const azucaresInt = parseInteger(azucares);
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
      [id_usuario, nombre, imagen, caloriasInt, grasasInt, azucaresInt],
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

    const values = ingredientes.map((i, index) => {
      const orden = parseInteger(i.orden);
      return [
        id_receta,
        orden > 0 ? orden : index + 1,
        parseInteger(i.cantidad),
        i.unidad,
        i.ingrediente
      ];
    });

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
      return insertarCategorias(id_receta);
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

      insertarCategorias(id_receta);
    });
  }

  function insertarCategorias(id_receta) {
    if (!categorias || categorias.length == 0) {
      return finalizar();
    }

    const sql = `
      INSERT INTO receta_categoria
      (id_receta, id_categoria)
      VALUES ?
    `;

    const values = categorias.map(a => [
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

router.get('/recientes', verificarToken, (req, res) => {

  const id_usuario = req.user.id;

  db.query(
    "SELECT id_receta, nombre, imagen FROM receta WHERE id_usuario = ? ORDER BY fecha_creacion DESC LIMIT 5",
    [id_usuario],
    (err, recetas) => {
      if (err) return res.status(500).json(err);
      if (!recetas || recetas.length === 0) {
        console.log("No se encontraron recetas para el usuario");
        return res.status(200).json([]);
      }

      let procesadas = 0;
      const resultado = [];

      recetas.forEach((receta, index) => {
        db.query(
          "SELECT id_categoria FROM receta_categoria WHERE id_receta = ?",
          [receta.id_receta],
          (err, categorias) => {
            //console.log(`Receta ID ${receta.id} - Categorías encontradas:`, categorias);
            if (err) return res.status(500).json(err);

            resultado[index] = {
              id: receta.id_receta,
              nombre: receta.nombre,
              imagen: receta.imagen,
              categorias: categorias ? categorias.map(c => c.id_categoria) : []
            };

            procesadas++;
            if (procesadas === recetas.length) {
              //console.log("Recetas procesadas:", resultado);
              res.status(200).json(resultado);
            }
          }
        );
      });
    }
  );

});

router.get('/alergenos', verificarToken, (req, res) => {
  db.query("SELECT id_alergeno, nombre FROM alergeno", (err, results) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(results);
  });
});

router.get('/categorias', verificarToken, (req, res) => {

  db.query("SELECT * FROM CATEGORIA", (err, results) => {
    res.json(results);
  });

});

router.post('/planificar', verificarToken, (req, res) => {
  const { fecha, id_receta } = req.body;
  const id_usuario = req.user.id;

  const sql = `INSERT INTO PLANIFICACION (fecha, id_usuario, id_receta) VALUES (?, ?, ?)`;
  console.log(`Planificando receta ID ${id_receta} para el usuario ID ${id_usuario} en la fecha ${fecha}`);

  db.query(sql, [fecha, id_usuario, id_receta], (err, result) => {
    if (err) return res.status(500).json(err.message);
    res.status(201).json({ message: "Receta planificada correctamente" });
    console.log(`Receta ID ${id_receta} planificada para el usuario ID ${id_usuario} en la fecha ${fecha}`);
  });
});

router.get('/planificadas', verificarToken, (req, res) => {
  const id_usuario = req.user.id;

  const sql = `
    SELECT r.id_receta, r.nombre, r.imagen, DATE_FORMAT(p.fecha, '%Y-%m-%d') AS fecha
    FROM receta r
    JOIN PLANIFICACION p ON r.id_receta = p.id_receta
    WHERE p.id_usuario = ?
    ORDER BY p.fecha DESC
  `;

  db.query(sql, [id_usuario], (err, results) => {
    if (err) return res.status(500).json(err);
    if (!results || results.length === 0) {
      console.log("No se encontraron recetas planificadas para el usuario");
      return res.status(200).json([]);
    }

    let procesadas = 0;
    const resultado = [];

    results.forEach((row, index) => {
      db.query(
        "SELECT id_categoria FROM receta_categoria WHERE id_receta = ?",
        [row.id_receta],
        (err, categorias) => {
          if (err) return res.status(500).json(err);

          resultado[index] = {
            id: row.id_receta,
            nombre: row.nombre,
            imagen: row.imagen,
            fecha: row.fecha,
            categorias: categorias ? categorias.map(c => c.id_categoria) : []
          };

          procesadas++;
          if (procesadas === results.length) {
            res.status(200).json(resultado);
          }
        }
      );
    });
  });
});

router.get('/:id', verificarToken, (req, res) => {

  const { id } = req.params;
  const id_usuario = req.user.id;

  db.query(
    "SELECT nombre, imagen, calorias, grasas, azucares FROM receta WHERE id_receta = ? AND id_usuario = ?",
    [id, id_usuario],
    (err, results) => {
      if (err) return res.status(500).json(err);
      if (!results || results.length === 0) {
        return res.status(404).json({ message: "Receta no encontrada" });
      }

      const receta = results[0];
      let datosCompletos = { ...receta };

      // Obtener ingredientes
      db.query(
        "SELECT orden, cantidad, unidad, ingrediente FROM receta_ingrediente WHERE id_receta = ? ORDER BY orden",
        [id],
        (err, ingredientes) => {
          if (err) return res.status(500).json(err);
          datosCompletos.ingredientes = ingredientes || [];

          // Obtener pasos
          db.query(
            "SELECT numero, descripcion FROM paso WHERE id_receta = ? ORDER BY numero",
            [id],
            (err, pasos) => {
              if (err) return res.status(500).json(err);
              datosCompletos.pasos = pasos || [];

              // Obtener alergenos
              db.query(
                "SELECT id_alergeno FROM receta_alergeno WHERE id_receta = ?",
                [id],
                (err, alergenos) => {
                  if (err) return res.status(500).json(err);
                  datosCompletos.alergenos = alergenos ? alergenos.map(a => a.id_alergeno) : [];

                  // Obtener categorias
                  db.query(
                    "SELECT id_categoria FROM receta_categoria WHERE id_receta = ?",
                    [id],
                    (err, categorias) => {
                      if (err) return res.status(500).json(err);
                      datosCompletos.categorias = categorias ? categorias.map(c => c.id_categoria) : [];

                      res.status(200).json(datosCompletos);
                      console.log("Datos completos de la receta:", datosCompletos);
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );

});



router.put('/:id', verificarToken, (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id;
  const {
    nombre,
    imagen,
    calorias,
    grasas,
    azucares,
    ingredientes,
    pasos,
    alergenos,
    categorias
  } = req.body;

  const caloriasInt = parseInteger(calorias);
  const grasasInt = parseInteger(grasas);
  const azucaresInt = parseInteger(azucares);

  db.beginTransaction(err => {
    if (err) return res.status(500).json(err);

    const sqlReceta = `
      UPDATE receta
      SET nombre = ?, imagen = ?, calorias = ?, grasas = ?, azucares = ?
      WHERE id_receta = ? AND id_usuario = ?
    `;

    db.query(
      sqlReceta,
      [nombre, imagen, caloriasInt, grasasInt, azucaresInt, id, id_usuario],
      (err, result) => {
        if (err) {
          return db.rollback(() => res.status(500).json(err));
        }

        if (!result || result.affectedRows === 0) {
          return db.rollback(() => res.status(404).json({ message: "Receta no encontrada" }));
        }

        eliminarDatosRelacionados();
      }
    );
  });

  function eliminarDatosRelacionados() {
    const sqls = [
      ["DELETE FROM receta_categoria WHERE id_receta = ?", [id]],
      ["DELETE FROM receta_alergeno WHERE id_receta = ?", [id]],
      ["DELETE FROM paso WHERE id_receta = ?", [id]],
      ["DELETE FROM receta_ingrediente WHERE id_receta = ?", [id]]
    ];

    let indice = 0;
    ejecutarDelete();

    function ejecutarDelete() {
      if (indice >= sqls.length) {
        insertarIngredientes();
        return;
      }

      const [sql, params] = sqls[indice++];
      db.query(sql, params, (err) => {
        if (err) {
          return db.rollback(() => res.status(500).json(err));
        }
        ejecutarDelete();
      });
    }
  }

  function insertarIngredientes() {
    if (!ingredientes || ingredientes.length === 0) {
      return insertarPasos();
    }

    const sql = `
      INSERT INTO receta_ingrediente
      (id_receta, orden, cantidad, unidad, ingrediente)
      VALUES ?
    `;

    const values = ingredientes.map((i, index) => {
      const orden = parseInteger(i.orden);
      return [
        id,
        orden > 0 ? orden : index + 1,
        parseInteger(i.cantidad),
        i.unidad,
        i.ingrediente
      ];
    });

    db.query(sql, [values], (err) => {
      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }
      insertarPasos();
    });
  }

  function insertarPasos() {
    if (!pasos || pasos.length === 0) {
      return insertarAlergenos();
    }

    const sql = `
      INSERT INTO paso
      (id_receta, numero, descripcion)
      VALUES ?
    `;

    const values = pasos.map(p => [
      id,
      p.numero,
      p.descripcion
    ]);

    db.query(sql, [values], (err) => {
      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }
      insertarAlergenos();
    });
  }

  function insertarAlergenos() {
    if (!alergenos || alergenos.length === 0) {
      return insertarCategorias();
    }

    const sql = `
      INSERT INTO receta_alergeno
      (id_receta, id_alergeno)
      VALUES ?
    `;

    const values = alergenos.map(a => [
      id,
      a
    ]);

    db.query(sql, [values], (err) => {
      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }
      insertarCategorias();
    });
  }

  function insertarCategorias() {
    if (!categorias || categorias.length == 0) {
      return finalizarActualizacion();
    }

    const sql = `
      INSERT INTO receta_categoria
      (id_receta, id_categoria)
      VALUES ?
    `;

    const values = categorias.map(a => [
      id,
      a
    ]);

    db.query(sql, [values], (err) => {
      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }
      finalizarActualizacion();
    });
  }

  function finalizarActualizacion() {
    db.commit(err => {
      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }
      res.status(200).json({ message: "Receta actualizada correctamente" });
    });
  }
});

router.delete('/:id', verificarToken, (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id;

  db.beginTransaction(err => {
    if (err) return res.status(500).json(err);

    const sqls = [
      ["DELETE FROM receta_categoria WHERE id_receta = ?", [id]],
      ["DELETE FROM receta_alergeno WHERE id_receta = ?", [id]],
      ["DELETE FROM paso WHERE id_receta = ?", [id]],
      ["DELETE FROM receta_ingrediente WHERE id_receta = ?", [id]],
      ["DELETE FROM PLANIFICACION WHERE id_receta = ?", [id]],
      ["DELETE FROM receta WHERE id_receta = ? AND id_usuario = ?", [id, id_usuario]]
    ];

    let indice = 0;
    ejecutarDelete();

    function ejecutarDelete() {
      if (indice >= sqls.length) {
        db.commit(err => {
          if (err) {
            return db.rollback(() => res.status(500).json(err));
          }
          res.status(200).json({ message: "Receta eliminada correctamente" });
        });
        return;
      }

      const [sql, params] = sqls[indice++];
      db.query(sql, params, (err, result) => {
        if (err) {
          return db.rollback(() => res.status(500).json(err));
        }

        if (indice === sqls.length && (!result || result.affectedRows === 0)) {
          return db.rollback(() => res.status(404).json({ message: "Receta no encontrada" }));
        }

        ejecutarDelete();
      });
    }
  });
});

module.exports = router;