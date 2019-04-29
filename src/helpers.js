const hbs = require('hbs');
const Table = require('table-builder');
const Usuario = require('../models/usuario');
const Inscripcion = require('../models/inscripcion');
const Curso = require('../models/curso');


let listarCursos = (callback) => {
    Curso.find({}).exec((err, listaCursos) => {
        if (err) throw (err);   
        let response = 'No hay cursos registrados';

        if(listaCursos.length > 0){
            const table = new Table({class: 'table'});
            const headers = {id: 'Id', nombre: 'Nombre', descripcion: 'Descripción', valor: 'Valor', modalidad: 'Modalidad', intensidad: 'Intensidad', estado: 'Estado'};
            response = table.setHeaders(headers).setData(listaCursos).render();
        } 
        callback(response)
    });     
};

let listarUsuarios = (callback) => {
    Usuario.find({}).exec((err, listaUsuarios) => {
        if (err) throw (err);   
        let response = 'No hay usuarios registrados';

        if(listaUsuarios.length > 0){
            const table = new Table({class: 'table'});
            const headers = {documento: 'Documento', nombre: 'Nombre', correo: 'Correo Electrónico', telefono: 'Teléfono', rol: 'Rol' };
            response = table.setHeaders(headers).setData(listaUsuarios).render();
        } 
        callback(response)
    });     
};

let obtenerCursos = (id, callback) => {
    Curso.find(id ? { id : id }: {}).exec((err, result) => {
        if (err) throw (err);   
        callback(result);    
    });   
};

let obtenerUsuarios = (documento, callback) => {
    Usuario.find(documento ? { documento : documento }: {}).exec((err, result) => {
        if (err) throw (err);   
        callback(result);    
    }); 
};

let obtenerInscripciones = (documento, id, callback) => {
    Inscripcion.find((documento && id) ? {idUsuario : documento, idCurso: id} : {}).exec((err, result) => {
        if (err) throw (err);   
        callback(result);  
    }); 
};

let obtenerInscripcionesPorCurso = (id, callback) => {
    Inscripcion.find({idCurso: id}).exec((err, result) => {
        if (err) throw (err);   
        callback(result);    
    }); 
};

let obtenerCursosDisponibles = (callback) => {
    Curso.find({ estado : 'disponible'}).exec((err, listaCursos) => {
        if (err) throw (err);   
       
        callback(listaCursos)
    });       
};

let guardarCurso = (curso, callback) => {
    Curso.find({ id : curso.id }).exec((err, cursoExistente) => {
        if (err) throw (err);   
       
        if(cursoExistente.length === 0){
            let cursoNuevo = new Curso({
                id: curso.id,
                nombre: curso.nombre,
                descripcion: curso.descripcion,
                valor: curso.valor,
                modalidad: curso.modalidad,
                intensidad: curso.intensidad,
                estado: 'disponible'
            });
            curso.validacion = 'Curso guardado satisfactoriamente!';
            cursoNuevo.save((err, result) => {
                if (err) throw (err); 
                callback(curso);
            });
           
        }else{   
            curso.validacion = 'El curso con id: ' + curso.id + ' ya existe!';        
            curso.estado = 'invalido';
            callback(curso);
        } 
    });   
};

let inscribir = (aspirante, callback) => {
    
    obtenerUsuarios(aspirante.documento, (usuarioExistente) => {
   
            let usuario = new Usuario({
                documento: aspirante.documento,
                nombre: aspirante.nombre,
                correo: aspirante.correo,
                telefono: aspirante.telefono,
                rol: aspirante.rol,
                password: aspirante.password
            });

            obtenerInscripciones(aspirante.documento, aspirante.idCurso, (inscripcionExistente) => {

                    if(inscripcionExistente.length === 0){

                        let finalizarInscripcion = (aspirante) => {
                            let inscripcion = new Inscripcion({
                                idUsuario: aspirante.documento,
                                idCurso: aspirante.idCurso
                            });
                            
                            aspirante.validacion = 'Inscripción guardada satisfactoriamente!';
                            inscripcion.save((err, result) => {
                                if (err) throw (err); 
                                callback(aspirante);
                            });
                        };

                        if(usuarioExistente.length > 0){

                            Usuario.findOneAndUpdate({ documento : usuarioExistente[0].documento }, 
                                            { $set: { "nombre" : usuario.nombre, "correo" : usuario.correo, "telefono" : usuario.telefono } }, 
                                            (err, result) => {
                                                if (err) throw (err); 
                                                finalizarInscripcion(aspirante);          
                                            });     
                        }else{   
                            usuario.save((err, result)  => {
                                if (err) throw (err); 
                                finalizarInscripcion(aspirante);
                            });
                        } 
                    }
                    else{
                        aspirante.validacion = 'El aspirante con documento: ' + aspirante.documento + ' ya esta inscrito en el curso: ' + aspirante.nombreCurso + '!';        
                        aspirante.estado = 'invalido';
                        callback(aspirante);
                    } 
            }); 
    });      
};

let obtenerCursosYAspirantes = (callback) => {

    obtenerCursosDisponibles((listaCursos) => {

            obtenerUsuarios(null, (listaUsuarios) => {

                    obtenerInscripciones(null, null, (listaInscripciones) => {

                        listaCursos.forEach(curso => {
                            let inscripcionesCurso = listaInscripciones.filter(
                                    (reg) => {
                                        return reg.idCurso === curso.id;
                                }
                            );
                            curso.aspirantes = [];
                            inscripcionesCurso.forEach(inscripcion => {
                                let usuarioExistente = listaUsuarios.find((usuario) => {
                                    return usuario.documento === inscripcion.idUsuario;
                                });
                                curso.aspirantes.push(usuarioExistente);
                            });
                        });
                        callback(listaCursos);
                    });
            });
    });
};

let cerrarCurso = (id, callback) => {
    Curso.findOneAndUpdate({ id : id }, {estado : 'cerrado'}, (err, result) => {
        if (err) throw (err);   
        callback();        
    });        
};

let retirarAspiranteCurso = (idCurso, documento, callback) => {
    obtenerCursos(idCurso, (cursoExistente) => {
  
            if(cursoExistente.length === 0){
                respuesta = 'Curso no existe. ';
                callback(respuesta);
            }
            else{
                obtenerUsuarios(documento, (usuarioExistente) => {

                        if(usuarioExistente.length === 0){
                            respuesta = 'Usuario no existe';
                            callback(respuesta);
                        }
                        else{
                            obtenerInscripciones(documento, idCurso, (inscripcionExistente) => {
                           
                                if(inscripcionExistente.length === 0){
                                    respuesta = 'El Usuario no esta inscrito en el curso';
                                    callback(respuesta);
                                }
                                else{
                                    Inscripcion.findOneAndDelete({idUsuario : documento, idCurso: idCurso}, (err, result) => {
                                        if (err) throw (err);   
    
                                        obtenerInscripcionesPorCurso(cursoExistente[0].id, (inscripcionesCurso) => {
                             
                                            obtenerUsuarios(null, (listaUsuarios) => {
                                     
                                                cursoExistente[0].aspirantes = [];
                                                inscripcionesCurso.forEach(inscripcion => {
                                                    let usuarioExistente = listaUsuarios.find((usuario) => {
                                                        return usuario.documento === inscripcion.idUsuario;
                                                    });
                                                    cursoExistente[0].aspirantes.push(usuarioExistente);
                                                });
                                                cursoExistente[0].validacion = 'Inscripción retirada satisfactoriamente!';
                                                callback(cursoExistente[0]);
                                            });
                                        });
                                    });                                           
                                }
                            });
                        }
                });
            }
    });
};

let guardarUsuario = (usuario, callback) => {
    Usuario.find({ documento : usuario.documento }).exec((err, usuarioExistente) => {
        if (err) throw (err);   
       
        if(usuarioExistente.length === 0){
            let usuarioNuevo = new Usuario({
                documento: usuario.documento,
                nombre: usuario.nombre,
                correo: usuario.correo,
                telefono: usuario.telefono,
                rol: usuario.rol,
                password: usuario.password,
                avatar: usuario.avatar
            });
            usuario.validacion = 'Usuario guardado satisfactoriamente!';
            usuarioNuevo.save((err, result) => {
                if (err) throw (err); 
                callback(usuario);
            });
           
        }else{   
            usuario.validacion = 'El Usuario con documento: ' + usuario.documento + ' ya existe!';        
            usuario.estado = 'invalido';
            callback(usuario);
        } 
    });   
};

let validarUsuario = (usuario, callback) => {
    Usuario.find({ documento : usuario.documento }).exec((err, usuarioExistente) => {
        if (err) throw (err);   

        if(usuarioExistente.length > 0 && usuarioExistente[0].password === usuario.password){
            callback(usuarioExistente[0]);
        }else{   
            usuario.validacion = 'Usuario o contraseña invalida!';        
            usuario.estado = 'invalido';
            callback(usuario);
        } 
    });   
};

let actualizarAvatar = (usuario, callback) => {     
    Usuario.findOneAndUpdate({ documento : usuario.documento }, {avatar : usuario.avatar}, (err, result) => {
        if (err) throw (err);   
        usuario.validacion = 'Avatar actualizado satisfactoriamente!';
        callback(usuario);        
    });   
};

module.exports = {
    listarCursos,
    guardarCurso,
    obtenerCursosDisponibles,
    inscribir,
    obtenerCursosYAspirantes,
    cerrarCurso,
    retirarAspiranteCurso,
    listarUsuarios,
    guardarUsuario,
    validarUsuario,
    actualizarAvatar,
    obtenerInscripcionesPorCurso,
    obtenerCursos
};