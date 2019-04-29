class Conexion{
    constructor(){
        this.conexiones = [];
    }

    conectar(usuario){
        this.conexiones.push(usuario);
        console.log('Usuario ' + usuario.usuario + ' conectado satisfactoriamente!');
    }

    desconectar(usuario){
        let conexionIndex = this.conexiones.findIndex((reg) => {
            return reg.id === usuario.id;
        });
        if(conexionIndex > -1){
            console.log('Usuario ' + this.conexiones[conexionIndex].usuario + ' desconectado satisfactoriamente!');
            this.conexiones.splice(conexionIndex, 1);
        }
    }

    getConexion(usuario){
        //console.log(this.conexiones);
        let conexion = this.conexiones.find((reg) => {
            return reg.id === usuario.id || reg.usuario === usuario.usuario;
        });
       return conexion ? conexion : null;
    }
}


module.exports = {
	Conexion
}
