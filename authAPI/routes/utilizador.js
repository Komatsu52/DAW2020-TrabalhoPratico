var express = require('express');
const passport = require('passport');
var router = express.Router();
var Utls = require('../controllers/utilizador');
var jwt = require('jsonwebtoken')

/* GET devolve todos os utilizadores */
router.get('/' , function(req,res,next){
    Utls.listar()
        .then(dados => {
            res.jsonp(dados)
        })
        .catch(erro => {
            console.log(erro);
            res.status(500).jsonp(erro)    
        })
})

/* GET devolve utilizador com determinado email */
router.get('/:email', function(req,res,next){
    Utls.procurar(req.params.email)
        .then(dados => {
            res.jsonp(dados)
        })
        .catch(erro => {
            console.log(erro);
            res.status(500).jsonp(erro)    
        })
})

/* POST login */
router.post('/login', passport.authenticate('local'), function(req,res){
    Utls.procurar(req.body.email)
        .then(dados => {
            jwt.sign({ email: dados.email, nome: dados.nome, nivel: dados.nivel }, //nivel para ser usado pelo dataAPI 
                "DAWTP2020",
                {expiresIn: 1800},
                function(e, token){
                    if(e)
                        res.status(500).jsonp({error: "Erro na geração do token" + e})
                    else{          
                        Utls.atualizaData(req.body.email)
                        res.status(201).jsonp({ token: token, nivel: dados.nivel, email: req.body.email }) //nivel para ser usado na interface
                    }
                });
        })
        .catch(erro => {
            console.log(erro);
            res.status(500).jsonp(erro)    
        })
})

/* POST criação de um novo utilizador */
router.post('/', function(req,res,next){
    Utls.consultar(req.body.email, function(err, util) {
        if (err){
            next(err)
        }
        else if (util){
            res.status(406).jsonp({error: "Email já existente"})
        }
        else {
            Utls.adicionar(req.body, function(error, data){
                if (error){
                    next(error)
                }
                else if (data){
                    res.status(201).jsonp(data)
                }
            })
        }
    })
})

/* PUT modificar utilizador */
router.put('/:email', function(req,res,next){
    Utls.editar(req.params.email,req.body, function(error, data){
        if (error){
            next(error)
        }
        else if (data){
            res.status(201).jsonp(data)
        }
    })
})

/*DELETE apagar um utilizador */
router.delete('/:email', function(req,res,next){
    Utls.apagar(req.params.email)
        .then(dados => {
            res.jsonp(dados)
        })
        .catch(erro => {
            console.log(erro);
            res.status(500).jsonp(erro)
        })
})

module.exports = router;