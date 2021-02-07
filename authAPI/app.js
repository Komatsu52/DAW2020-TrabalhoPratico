var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var bcrypt = require('bcryptjs')

var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy

var mongoose = require('mongoose');

mongoose.set('useFindAndModify',false);

mongoose.connect('mongodb://127.0.0.1/userDB', 
    {
		useNewUrlParser: true,
        useUnifiedTopology: true,
		serverSelectionTimeoutMS: 5000
	});
    
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erro de conexão ao MongoDB...'));
db.once('open', function() {
    console.log("Conexão ao MongoDB realizada com sucesso...")
});

var Utilizador = require('./controllers/utilizador')

// Configuração da estratégia local
passport.use(new LocalStrategy(
    {usernameField: 'email'}, (email, password, done) => {
        Utilizador.procurar(email)
            .then(dados => {
                const utilizador = dados
                if(!utilizador) { return done(null, false, {message: 'Utilizador inexistente!\n'}) }

                bcrypt.compare(password, utilizador.password)
                    .then(function(resultado){
                        if(!resultado){
                            return done(null, false, {message: 'Credenciais inválidas!\n'})
                        }
                    })
          
                return done(null, utilizador)
            })
            .catch(erro => done(erro))
	}
))

// Indica-se ao passport como serializar o utilizador
passport.serializeUser((utilizador, done) => {
    done(null, utilizador.email)
})
    
// Desserialização: a partir do id obtem-se a informação do utilizador
passport.deserializeUser((email, done) => {
    Utilizador.procurar(email)
        .then(dados => done(null, dados))
        .catch(erro => done(erro, false))
})

var usersRouter = require('./routes/utilizador');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(passport.session());

app.use('/utilizador', usersRouter);

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
    res.status(err.status || 500);

});

module.exports = app;