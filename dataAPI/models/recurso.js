var mongoose = require('mongoose')

var recursoSchema = new mongoose.Schema({
    tipo: {type: [String], required:true},
    titulo: {type: String, required:true},
    subtitulo: String,
    dataCriacao: String,
    dataRegisto: String,
    visibilidade: {type: Boolean, required:true },
    nomeProdutor: String,
    emailProdutor: String,
    nomeFicheiro : String,
    validado: Boolean,
    likes: [String],
    comentarios: [{nome: String, comentario: String}]
})

module.exports = mongoose.model('recurso',recursoSchema)