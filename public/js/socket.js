socket = io();

socket.on("connect",() =>{
	console.log('Socket conectado!')
})

var login = document.querySelector('#login');
if  (login){
    const usuario = login.querySelector('#usuario');
    const password = document.querySelector('#password');

    login.addEventListener('submit', (datos) => {	

        datos.preventDefault();
        let data = {};
        data.usuario = usuario.value;
        data.password = password.value;
        $.ajax({
            type: 'POST',
            url: "/login",
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (data) {
                document.write(data);
                socket.emit('conectar', {
                    usuario : usuario.value                
                });
            }
        });

       
    });
}

var cerrarCurso = document.querySelectorAll('.cerrarCurso');
if  (cerrarCurso.length > 0){
    cerrarCurso.forEach(function(elem) {
            elem.addEventListener('click', (datos) => {	
            //debugger;
            datos.preventDefault();
            $.ajax({
                type: 'GET',
                url: "/closecourse?id=" + datos.srcElement.id,
                success: function (data) {
                    document.write(data);
                    debugger;
                    socket.emit('cerrarCurso', {
                        cursoId : datos.srcElement.id               
                    });
                }
            });
        });
    });
}

socket.on("mensajeAlerta", (text) =>{
	document.getElementById('lblPushDanger').innerText = text;
    $('.alert-danger').addClass('show');
    $('.alert-danger').show();
    $('.alert-danger .close').on('click',function(){
        $(this).parent().hide();
    });
})
