const mongoose = require('mongoose');

const Schema = mongoose.Schema;
//const ObjectId = Schema.ObjectId;
 
const usuarioSchema = new Schema({
  documento: { type: Number, require: true },
  nombre: { type: String, require: true },
  password: { type: String, require: true },
  correo: { type: String, require: true },
  telefono: { type: Number, require: true },
  rol: { type: String, require: true },
  avatar: { type: Buffer }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;