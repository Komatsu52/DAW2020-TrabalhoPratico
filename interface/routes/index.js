var express = require('express')
var router = express.Router()
var axios = require('axios')
var multer = require('multer')
var fs = require('fs')
var FormData = require('form-data')
var crypto = require('crypto')
var zipper = require('zip-local')
const followRedirects = require('follow-redirects');
followRedirects.maxBodyLength = 25 * 1024 * 1024;

var upload = multer({dest:'uploads/'})

/* GET pagina inicial */
router.get('/', function(req, res, next) {
    res.render('index');
});

/* GET pagina de registo de utilizador */
router.get('/registo',function(req,res,next){
    res.render('registo')
})

/* GET pagina de edicao de perfil de utilizador */
router.get('/editarPerfil',function(req,res,next){
     axios.get('http://localhost:7700/utilizador/' + req.cookies.email)
        .then(dados => res.render('editarPerfil', { uti : dados.data }))
        .catch(e => res.render('error',{error : e}))
})

/* GET Resource Form Page */
router.get('/recursoForm',function(req,res,next){
    axios.get('http://localhost:7800/recurso/tipos?token=' + req.cookies.token)
        .then(dados => res.render('recursoForm', { tipos: dados.data }))
        .catch(e => res.render('error', {error : e}))   
})

/* funcao de ordenacao de listas */
function dynamicSort(property){
    var sortOrder = 1;
    //ordenação decrescente
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result

        if (property == "likes")
            result = (a[property].length < b[property].length) ? -1 : (a[property].length > b[property].length) ? 1 : 0;
        else
            result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;

        return result * sortOrder;
    }
}

/* GET pagina principal */
router.get('/recurso', function(req,res){
    axios.get('http://localhost:7800/recurso?token=' + req.cookies.token)
        .then(dados => {
            //para ordenar tipo/titulo/subtitulo.. quando se clica neles
            if(req.query.orderBy != null && req.query.orderBy != "")
                dados.data.sort(dynamicSort(req.query.orderBy))

            //search bar
            if(req.query.search != null && req.query.search != "" && req.query.searchBy != null && req.query.searchBy != ""){
                var aux = []

                dados.data.forEach(s => {
                    if(req.query.searchBy == "tipo"){
                        for(i = 0; i < s[req.query.searchBy].length; i++){
                            if(s[req.query.searchBy][i].includes(req.query.search)){
                                aux.push(s)
                                break
                            }
                        }
                    }

                    else if(s[req.query.searchBy].includes(req.query.search)){
                        aux.push(s)
                    }
                })

                dados.data = aux

                res.render('recursos', { lista: dados.data, nivel: req.cookies.nivel, email: req.cookies.email, search: req.query.search, searchBy: req.query.searchBy })
            }
            else
                res.render('recursos', { lista: dados.data, nivel: req.cookies.nivel, email: req.cookies.email })
        })
        .catch(e => res.render('error', {error : e}))
})

/* GET formulario para adicao de um tipo */
router.get('/tipoForm',function(req,res,next){
    axios.get('http://localhost:7800/recurso/tipos?token=' + req.cookies.token)
        .then(dados => res.render('recursoTipo', { tipos: dados.data }))
        .catch(e => res.render('error', {error : e}))   
})

/* GET Logout */
router.get('/logout', function(req, res){
    res.cookie('token', "", {
        expires: new Date(Date.now() + '1s'),
        secure: false,
        httpOnly: true
    })
    //Obter o nivel de acesso
    res.cookie('nivel', "", {
        expires: new Date(Date.now() + '1s'),
        secure: false,
        httpOnly: true
    })
    //Obter o email para saber o produtor que adicionou o recurso
    res.cookie('email', "", {
        expires: new Date(Date.now() + '1s'),
        secure: false,
        httpOnly: true
    })
    res.redirect('/')
})

/* GET download de um ficheiro */
router.get('/recurso/download/:fname', function(req,res){
    var filename = req.params.fname

    axios({
        method: "get",
        url: "http://localhost:7800/recurso/download/" + filename + "?token=" + req.cookies.token,
        responseType: "stream"
    })
        .then(function (response) {
            var stream = response.data.pipe(fs.createWriteStream(__dirname + '/../public/downloads/' + filename))      
            
            stream.on('finish', function(){
                res.download(__dirname + '/../public/downloads/' + filename, function(erro){
                    if(!erro){
                        fs.unlinkSync(__dirname + '/../public/downloads/' + filename, (err)=>{
                            if(err) {
                                res.status(500).render('error', {error : err})
                            }
                            
                            res.redirect('/recurso')
                        })
                    }
                })
            })                  
        })
        .catch(err => res.status(500).render('error', {error : err}))
})

/* GET informação toda de um recurso */
router.get('/recurso/:id',function(req,res,next){
    axios.get('http://localhost:7800/recurso/' + req.params.id + '?token=' + req.cookies.token)
        .then(dados => res.render('recursoInfo', { recurso: dados.data, nivel: req.cookies.nivel, email: req.cookies.email }))
        .catch(e => res.render('error', {error : e}))   
})

/* POST pagina de registo */
router.post('/registo',function(req,res,next){
    var novoUti = req.body
    
    axios.post('http://localhost:7700/utilizador', novoUti)
        .then(() => res.redirect('/'))     
        .catch(err => res.status(500).render('error', {error : err}))   
})

/* POST editar Perfil */
router.post('/editarPerfil', function(req,res,next){
    var utiAtu = req.body

    axios.put('http://localhost:7700/utilizador/' + req.cookies.email, utiAtu)
        .then(() => res.redirect('/recurso'))    
        .catch(err => res.status(500).render('error', {error : err}))
})

/* POST pôr gosto no recurso */
router.post('/recurso/like/:id', function(req,res,next){
    axios.post('http://localhost:7800/recurso/like/' + req.params.id + '?token=' + req.cookies.token)
        .then(() => res.redirect('back'))    
        .catch(err => res.status(500).render('error', {error : err})) 

})

/* POST pôr comentário no recurso */
router.post('/recurso/comentario/:id', function(req,res,next){
    axios.post('http://localhost:7800/recurso/comentario/' + req.params.id + '?token=' + req.cookies.token, req.body)
        .then(() => res.redirect('back'))    
        .catch(err => res.status(500).render('error', {error : err})) 

})

/* POST pagina de submissao de um tipo */
router.post('/recurso/tipo',function(req,res,next){
    axios.post('http://localhost:7800/recurso/tipo?token=' + req.cookies.token, req.body)
        .then(() => res.redirect('/recurso'))    
        .catch(err => res.status(500).render('error', {error : err}))   
})

/* funcao que cria um formulario de submissao com a informacao de um ficheiro */
function form_data_file(file, utilizador, info){
    return new Promise(function(resolve, reject){
        let form_data = new FormData();

        form_data.append("myfile", fs.createReadStream(file.path), file.originalname)
        form_data.append("tipo", JSON.stringify(info.tipo))
        form_data.append("titulo", info.titulo)
        form_data.append("subtitulo", info.subtitulo)
        form_data.append("visibilidade", info.visibilidade)
        form_data.append("dataCriacao", info.dataCriacao)
        form_data.append("nomeProdutor", utilizador.nome)
        form_data.append("emailProdutor", utilizador.email)
        resolve(form_data)
    })
}

/* funcao que trata do envio de um ficheiro para o servidor dos recursos */
function post_ficheiro(file, utilizador, info, token){
    return new Promise(function(resolve, reject){
        var uti = utilizador
        var infos = info
        var ficheiro = file
        var tok = token

        form_data_file(ficheiro, uti, infos)
            .then(form_data => {
                const request_config = {
                    headers: {
                        ...form_data.getHeaders()
                    }
                }
                
                axios.post('http://localhost:7800/recurso?token=' + tok, form_data, request_config)  
                    .then(dados => {
                        resolve(dados)
                    })
                    .catch(erro => console.log(JSON.stringify(erro)))
            })
    })
}

/* funcao que gera o checksum de um ficheiro */
function generateChecksum(str, algorithm, encoding) {
    return crypto.createHash(algorithm || 'sha256').update(str, 'utf8').digest(encoding || 'hex');
}

/* POST submissao de um recurso */
router.post('/recurso', upload.single('myfile'), function(req,res){

    axios.get('http://localhost:7700/utilizador/' + req.cookies.email)
        .then(dados => {
            var path = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_")

            //criacao da bag que ira conter a informacao
            fs.mkdir(path, (error) => { 
                if (error) { 
                    res.status(500).render('error', {error: error}) 
                }

                path = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_") + '/data'
                
                //criacao da pasta data dentro da bag
                fs.mkdir(path, (erro) => { 
                    if (erro) { 
                        res.status(500).render('error', {error: erro}) 
                    }

                    path = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_") + '/bagit.txt'

                    var conteudo = "BagIt-version: 1.0\nTag-File-Character-Encoding: UTF-8"

                    // criacao do ficheiro bagit.txt
                    fs.writeFile(path, conteudo, function (err) {
                        if (err) { 
                            res.status(500).render('error', {error: err}) 
                        }

                        path = __dirname + '/../' + req.file.path

                        //geracao do checksum do recurso a enviar na bag
                        fs.readFile(path, function(er, data) {
                            var checksum = generateChecksum(data);

                            path = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_") + '/manifest-sha256.txt'

                            conteudo = checksum + " data/" + req.file.originalname
                        
                            //criacao do ficheiro de manifesto
                            fs.writeFile(path, conteudo, function (e) {
                                if (e) { 
                                    res.status(500).render('error', {error: e}) 
                                }

                                var oldPath = __dirname + '/../' + req.file.path
                                var newPath = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_") + '/data/' + req.file.originalname

                                // mover o recurso a enviar da pasta de uploads para a pasta data
                                fs.rename(oldPath, newPath, function(e1){
                                    if(e1)
                                        throw e1

                                    else {
                                        oldPath = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_")
                                        newPath = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_") + ".zip"

                                        //criacao do zip da bag
                                        zipper.sync.zip(oldPath).compress().save(newPath)

                                        var uti = dados.data
                                        var info = req.body
                                        var file = {
                                            originalname: req.file.originalname.replace(/\./g, "_") + '.zip',
                                            path: 'public/fileToSend/' + req.file.originalname.replace(/\./g, "_") + '.zip'
                                        }
                                        var token = req.cookies.token

                                        //envio do recurso para o dataAPI
                                        post_ficheiro(file, uti, info, token)
                                            .then(() => {
                                                path = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_")
                                                
                                                // eliminar a bag criada
                                                fs.rmdir(path, { recursive: true }, (e2) =>{
                                                    if(e2){
                                                        res.status(500).render('error', {error: e2})
                                                    }
                                                    else{
                                                        path = __dirname + '/../public/fileToSend/' + req.file.originalname.replace(/\./g, "_") + ".zip"

                                                        //eliminar o zip da bag
                                                        fs.unlink(path, (e3) =>{
                                                            if(e3){
                                                                res.status(500).render('error', {error: e3})
                                                            }
                                                            else
                                                                res.redirect('/recurso')
                                                            })
                                                    }
                                                })
                                            })
                                            .catch(e2 => res.status(500).render('error', {error: e2}))
                                    } 
                                })
                            })
                        })
                    })
                })
            })
        })
        .catch(e => res.render('error', {error : e}))
})

/* POST enviar as informacoes para login */
router.post('/login', function(req,res){
    axios.post('http://localhost:7700/utilizador/login', req.body)
        .then(dados => {
            res.cookie('token', dados.data.token, {
                expires: new Date(Date.now() + '30m'),
                secure: false,
                httpOnly: true
            })
            //Obter o nivel de acesso
            res.cookie('nivel', dados.data.nivel, {
                expires: new Date(Date.now() + '30m'),
                secure: false,
                httpOnly: true
            })
            //Obter o email para saber o produtor que adicionou o recurso
            res.cookie('email', dados.data.email, {
                expires: new Date(Date.now() + '30m'),
                secure: false,
                httpOnly: true
            })
            res.redirect('/recurso')
        })
        .catch( () => res.redirect('/'))
});

/* POST apagar um comentário num recurso */
router.post('/recurso/comentario/apagar/:id', function(req, res, next){
    axios.delete('http://localhost:7800/recurso/comentario/apagar/' + req.params.id + '?token=' + req.cookies.token, {data: req.body})
        .then(() => res.redirect('back'))
        .catch(err => res.status(500).render('error', {error: err}))
})

/* POST administrador aprova recurso */
router.post('/recurso/aprovar/:id', function(req, res, next){
    axios.put('http://localhost:7800/recurso/aprovar/' + req.params.id + '?token=' + req.cookies.token, req.body)
        .then(() => res.redirect('/recurso'))
        .catch(err => res.status(500).render('error', {error: err}))
})

/*POST administrador nao aprova recurso (utiliza-se POST por causa do form do outro lado)*/
router.post('/recurso/naoaprovar/:id',function(req,res,next){
    axios.delete('http://localhost:7800/recurso/naoaprovar/' + req.params.id + '?token=' + req.cookies.token)
        .then(dados =>{
            res.redirect('/recurso')       
        })
        .catch(err => res.status(500).render('error', {error: err}))
})

/*POST apagar recurso (utiliza-se POST por causa do form do outro lado)*/
router.post('/recurso/:id',function(req,res,next){
    axios.delete('http://localhost:7800/recurso/' + req.params.id + '?token=' + req.cookies.token)
        .then(dados =>{
            res.redirect('/recurso')        
        })
        .catch(err => res.status(500).render('error', {error: err}))
})

module.exports = router;