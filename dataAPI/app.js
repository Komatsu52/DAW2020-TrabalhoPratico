var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var jwt = require('jsonwebtoken')

var mongoose = require('mongoose');

mongoose.set('useFindAndModify',false);

var mongoDB = 'mongodb://127.0.0.1/dataDB'
mongoose.connect(mongoDB,{useNewUrlParser: true, useUnifiedTopology: true});

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error...'));
db.once('open', function() {
    console.log("Conexão ao MongoDB realizada com sucesso...")
});

var recursoRouter = require('./routes/recurso');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//verifica se o pedido veio com o token de acesso
app.use(function(req,res,next){
    var myToken = req.query.token || req.body.token
    if(myToken){
        jwt.verify(myToken,'DAWTP2020',function(err,payload){
            if(err){
                res.status(401).jsonp({error: err})
            }
            else {
                //para enviar o nivel para o ficheiro das routes
                app.set('utilizador', payload)
                next()
            }
        })
    }
    else {
        res.status(401).jsonp({error: "Token inexistente!"})
    }
})

app.use('/recurso', recursoRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500).jsonp({error: err});

});

module.exports = app;