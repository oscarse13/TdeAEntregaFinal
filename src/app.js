const express = require('express');
const app = express();
const server =  require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
//const bcrypt = require('bcrypt'); Error en la instalación
const session = require('express-session');
const sgMail = require('@sendgrid/mail');
const multer  = require('multer');
const { Conexion } = require('././conexion');
const conexion = new Conexion();

const { listarCursos, guardarCurso, obtenerCursosDisponibles, inscribir, obtenerCursosYAspirantes, cerrarCurso, retirarAspiranteCurso, listarUsuarios, guardarUsuario, validarUsuario, actualizarAvatar, obtenerInscripcionesPorCurso, obtenerCursos } = require('./helpers');
require('./helpers')




const publicDirectory = path.join(__dirname, '../public');
const partialsDirectory = path.join(__dirname, '../partials');

app.use('/img', express.static(path.join(__dirname, '../public/images')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));

app.use(express.static(publicDirectory));
hbs.registerPartials(partialsDirectory);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '..', 'views'));

mongoose.connect(process.env.URLDB, { useNewUrlParser: true }, (err) =>{
    if (err)
        return console.log("Error conectando a DB: " + err);

    return console.log("Conectado a DB correctamente...");
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// var storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, '/public/uploads')
//     },
//     filename: function (req, file, cb) {
//       cb(null, 'avatar' + req.body.documento + path.extname(file.originalname)
//     }
//   })
  
var upload = multer({ });

io.on('connection', client => {
    client.on("conectar", (msg) =>{
        console.log(client.id);
        let usuario = {};
        usuario.id = client.id;
        usuario.usuario = msg.usuario;

		let conexionActual = conexion.getConexion(usuario);
        if(!conexionActual){
            conexion.conectar(usuario);
        }
    });
    
    client.on('disconnect',()=>{
        let usuario = {};
        usuario.id = client.id;

		let conexionActual = conexion.getConexion(usuario);
        if(!conexionActual){
            conexion.desconectar(usuario);
        }
     });
            
    client.on("cerrarCurso", (msg) =>{
        obtenerCursos(parseInt(msg.cursoId),  (cursoExistente) => {
            obtenerInscripcionesPorCurso(parseInt(msg.cursoId), (inscripcionesCurso) => {
                inscripcionesCurso.forEach(inscripcion => {
                    let usuario = { usuario : inscripcion.idUsuario.toString() };
                    let conexionUsuario = conexion.getConexion(usuario);
                    console.log(conexionUsuario);
                    if(conexionUsuario){
                        let texto = `El curso ${cursoExistente[0].nombre} en que estaba matriculado, ha sido cerrado`;
                        client.broadcast.to(conexionUsuario.id).emit("mensajeAlerta", texto);
                    }
                });
            });
        });
	})
  });

app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
  }));

  app.use((req, res, next) => {
        if(req.session.usuario){
            res.locals.coordinador = req.session.usuario.rol === 'coordinador';
            res.locals.aspirante = req.session.usuario.rol === 'aspirante';
            res.locals.usuariosesion = req.session.usuario;
            res.locals.avatar = req.session.avatarimage !== '';
            res.locals.avatarimage = req.session.avatarimage;
        }
        else{
            res.locals.aspirante = false;
        }
        next();
  });

app.get('/addcourse', (req, res) => {
    listarCursos((response) =>{
        res.render('addcourses', {
            displaymessage: 'none',
            listarCursos: response,
            usuariosesion: req.session.usuario
        });
    });
});

app.post('/addcourse', (req, res) => {
   
    let curso = {};
    curso.id = parseInt(req.body.id);
    curso.nombre = req.body.nombre;
    curso.descripcion = req.body.descripcion;
    curso.valor = req.body.valor;
    curso.modalidad = req.body.modalidad !== undefined ? req.body.modalidad : '';
    curso.intensidad = req.body.intensidad;
    curso.estado = 'disponible';

    guardarCurso(curso, 
                (curso) => {
                    if(curso.estado === 'invalido'){
                        listarCursos((response) =>{
                            res.render('addcourses', {
                            curso: curso,
                            displaymessage: 'block',
                            alertclass: 'danger',
                            listarCursos: response,
                           
                            });
                        });
                    }
                    else{
                        console.log(curso);
                        let cursoRespuesta = {};
                        cursoRespuesta.validacion = curso.validacion;
                        listarCursos((response) =>{

                                res.render('addcourses', {
                                curso: cursoRespuesta,
                                displaymessage: 'block',
                                alertclass: 'success',
                                listarCursos: response,
                               
                            });
                        });
                    }
                });
});

app.get('/seecourse', (req, res) => {

    obtenerCursosDisponibles((cursos) =>{
        res.render('seecourses', {
            cursos: cursos,
           
        });
    });
});

app.get('/enroll', (req, res) => {
    obtenerCursosDisponibles((cursos) =>{
        res.render('enroll', {
            cursos: cursos,
            displaymessage: 'none',
           
        });
    });
});

app.post('/enroll', (req, res) => {

    obtenerCursosDisponibles((cursos) =>{

        let aspirante = {};
        aspirante.documento = parseInt(req.body.documento);
        aspirante.nombre = req.body.nombre;
        aspirante.correo = req.body.correo;
        aspirante.telefono = req.body.telefono;
        aspirante.idCurso = parseInt(req.body.idCurso);
        aspirante.rol = 'aspirante';
        aspirante.password = req.body.documento;

        if(aspirante.idCurso){
            let cursoExistente = cursos.find((reg) => {
                return reg.id === aspirante.idCurso;
            });

            aspirante.nombreCurso = cursoExistente.nombre;

            inscribir(aspirante, (aspirante) => {
                let aspiranteRespuesta = {};
                aspiranteRespuesta.validacion = aspirante.validacion;
                res.render('enroll', {
                    aspirante: aspiranteRespuesta,
                    displaymessage: 'block',
                    alertclass: 'success',
                    cursos: cursos,
                   
                });
            });
        }
        else{
            aspirante.estado = 'invalido';
            aspirante.validacion = 'Debe seleccionar un curso para hacer la inscripción';
            res.render('enroll', {
                aspirante: aspirante,
                displaymessage: 'block',
                alertclass: 'danger',
                cursos: cursos,
               
            });
        }
    });
});

app.get('/seeaspirant', (req, res) => {
    obtenerCursosYAspirantes((cursos) => {
        res.render('seeaspirants', {
            cursos: cursos,
            displaymessage: 'none',
           
        });
    });
});

app.get('/closecourse', (req, res) => {    
    if(req.query.id){
        cerrarCurso(parseInt(req.query.id), () => {
            obtenerCursosYAspirantes((cursos) => {
                res.render('seeaspirants', {
                    cursos: cursos,
                    displaymessage: 'none'                   
                });
            });
        });
    }
});

app.post('/unsubscribe', (req, res) => {
    let aspirante = []
    let respuesta = [];
    let curso = [];
    let classRespuesta = 'danger';

    retirarAspiranteCurso(parseInt(req.body.idCurso), parseInt(req.body.documento), (respuesta) => {
        if(respuesta.id){
            aspirante.documento = parseInt(req.query.documento);
            aspirante.idCurso = parseInt(req.query.idCurso);
            aspirante.validacion = respuesta.validacion;
            curso = respuesta;
            classRespuesta = 'success';
        }else{
            aspirante.validacion = respuesta;
        }

        obtenerCursosYAspirantes((cursos) => {
            res.render('seeaspirants', {
                cursos: cursos,
                displaymessage: 'block',
                alertclass: classRespuesta,
                aspirante: aspirante,
                curso: curso,
               
            });
        });
    });
});

app.get('/adduser', (req, res) => {
    listarUsuarios((response) =>{
        res.render('addusers', {
            displaymessage: 'none',
            listarUsuarios: response,
           
        });
    });
});

app.post('/adduser', upload.single('archivo'), (req, res) => {
   
    let aspirante = {};
    aspirante.documento = parseInt(req.body.documento);
    aspirante.nombre = req.body.nombre;
    aspirante.correo = req.body.correo;
    aspirante.telefono = req.body.telefono;
    aspirante.rol = req.body.rol;
    aspirante.password = req.body.documento;
    aspirante.avatar = req.file.buffer;

    const msg = {
            to: req.body.correo,
            from: 'oscarse@gmail.com',
            subject: 'Bienvenido a TdeA Cursos',
            text: 'La inscripción del usuario ' + aspirante.nombre + ' fue exitosa ' +
                    ' -- usuario: ' + aspirante.documento +
                    ' -- contraseña: ' + aspirante.password
       };

    guardarUsuario(aspirante, 
                (usuario) => {
                    if(usuario.estado === 'invalido'){
                        listarUsuarios((response) =>{
                            res.render('addusers', {
                            usuario: usuario,
                            displaymessage: 'block',
                            alertclass: 'danger',
                            listarUsuarios: response,
                           
                            });
                        });
                    }
                    else{
                        sgMail.send(msg);
                        let usuarioRespuesta = {};
                        usuarioRespuesta.validacion = usuario.validacion;
                        listarUsuarios((response) =>{
                                res.render('addusers', {
                                usuario: usuarioRespuesta,
                                displaymessage: 'block',
                                alertclass: 'success',
                                listarUsuarios: response,
                               
                            });
                        });
                    }
                });
});


app.post('/login', (req, res) => {
   
    let usuario = {};
    usuario.documento = parseInt(req.body.usuario);
    usuario.password = req.body.password;

    validarUsuario(usuario, 
                (usuario) => {
                    if(usuario.estado === 'invalido'){
                        req.session.usuario = null;
                        res.render('index', {
                            usuario: usuario,
                            displaymessage: 'block',
                            alertclass: 'danger',
                            usuariosesion: req.session.usuario
                        });
                    }
                    else{
                        req.session.avatarimage =  usuario.avatar ? usuario.avatar.toString('base64') : '';
                        req.session.usuario = usuario;

                        let usuarioRespuesta = {};
                        usuarioRespuesta.validacion = usuario.validacion;
                        res.render('index', {
                            displaymessage: 'none',
                            usuariosesion: req.session.usuario,
                            coordinador: req.session.usuario.rol === 'coordinador',
                            aspirante: req.session.usuario.rol === 'aspirante',
                            avatar: req.session.avatarimage !== '',
                            avatarimage : req.session.avatarimage
                        });

                    }
                });
});

app.get('/logout', (req, res) => {
    req.session.usuario = null;
    res.render('index', {
        displaymessage: 'none',
        usuariosesion: req.session.usuario,
        coordinador: false,
        aspirante: false,
        avatar: false
    });
});

app.get('/handleavatar', (req, res) => {
    res.render('avatar', {
        displaymessage: 'none'
    });
});

app.post('/handleavatar', upload.single('archivo'), (req, res) => {

    let usuario = {};
    usuario = req.session.usuario;
    usuario.avatar = req.file.buffer;

    actualizarAvatar(usuario, 
        (usuario) => {
            if(usuario.estado === 'invalido'){               
                res.render('avatar', {
                    displaymessage: 'block',
                    alertclass: 'danger'
                });
            }
            else{
                req.session.avatarimage =  usuario.avatar ? usuario.avatar.toString('base64') : '';
                req.session.usuario = usuario;
                let usuarioRespuesta = {};
                usuarioRespuesta.validacion = usuario.validacion;
                res.render('avatar', {
                    usuario: usuarioRespuesta,
                    displaymessage: 'block',
                    alertclass: 'success' ,
                    avatar: req.session.avatarimage !== '',
                    avatarimage : req.session.avatarimage                     
                });
            }
        });
});

app.get('/*', (req, res) => {
    res.render('index', {
        displaymessage: 'none'
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log('Escuchando en el puerto ' + process.env.PORT || 3000);
});
