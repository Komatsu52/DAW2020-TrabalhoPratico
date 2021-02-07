var Tipo = require('../models/tipo')

module.exports.listar = () => {
    return Tipo
        .find()
        .sort({tipo:1})
        .exec()
}

module.exports.adicionar = t => {    
    var novoTipo = new Tipo(t)
    
    return novoTipo.save()
}