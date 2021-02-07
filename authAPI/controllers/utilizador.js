var Utilizador = require('../models/utilizador')
var bcrypt = require('bcryptjs')

//Retorna a lista de utilizadores
module.exports.listar = () => {
    return Utilizador.find().sort({nome:1}).exec()
}

module.exports.procurar = email => {
    return Utilizador.findOne({email: email}).exec()
}

module.exports.adicionar = (utilizador, callback) => {
    bcrypt.hash(utilizador.password,6)
        .then(function(hash){
            utilizador.password = hash
            utilizador.dataRegisto = new Date().toISOString().substring(0,10)
            utilizador.dataUltimoAcesso = new Date().toISOString().substring(0,10)
            var novoUti = new Utilizador(utilizador)
            return novoUti.save().then(data => callback(null, data))
        }) 
        .catch(erro => {
            callback(erro, null)
        })   
}

module.exports.apagar = email => {
    return Utilizador.findOneAndDelete({email: email}).exec()
}

module.exports.editar = (email,utilizador, callback) =>{
    if(utilizador.password != ""){
        bcrypt.hash(utilizador.password,6)
        .then(function(hash){
            utilizador.password = hash
            return Utilizador
                .findOneAndUpdate({email: email},{$set:{nome: utilizador.nome,filiacao: utilizador.filiacao,password:utilizador.password}})
                .exec().then(data => callback(null, data))
        }) 
        .catch(erro => {
            callback(erro, null)
        }) 
    }
    else{
        return Utilizador
            .findOneAndUpdate({email: email},{$set:{nome: utilizador.nome,filiacao: utilizador.filiacao}})
            .exec().then(data => callback(null, data))
    }
}

module.exports.consultar = (e, callback) => {
    return Utilizador
        .findOne({email: e})
        .exec()
            .then(data => callback(null, data))
            .catch(erro => {
                callback(erro, null)
            })  
}

//cada vez que faz login vai atualizar a data do último acesso para esta não ser sempre igual
module.exports.atualizaData = (email) =>{
    var aux = new Date().toISOString().substring(0,10)
    return Utilizador
        .findOneAndUpdate({email: email},{$set:{dataUltimoAcesso: aux}})
        .exec()
}