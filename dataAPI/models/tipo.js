var mongoose = require('mongoose')

var tipoSchema = new mongoose.Schema({
    tipo: {type: String, required:true}
})

module.exports = mongoose.model('tipo',tipoSchema)