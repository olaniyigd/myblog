const express = require ("express");
const app = express();
const cors = require ('cors');
const mongoose  = require("mongoose");
const bcrypt = require ("bcrypt");
const User = require ("./model/User");
const Post = require ("./model/Post");
const jwt = require ("jsonwebtoken");
const cookieParser = require ("cookie-parser");
const multer = require ("multer");
const fs = require ("fs");
const uploadMiddleware = multer({ dest: 'uploads/' });


app.use(cors({credentials:true, origin:"http://localhost:3000"}))
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
mongoose.connect("mongodb+srv://dakieo:gervinho01@cluster0.qwcnq1s.mongodb.net/Blog?retryWrites=true&w=majority")

const salt = bcrypt.genSaltSync(10);
const secrete = "dakieoGesh"
app.post("/register", async (req, res)=>{
    const {username, password} = req.body;
    
    try {
        const userDoc = await User.create({
            username, 
            password:bcrypt.hashSync(password, salt)
        })
        res.json(userDoc)
    } catch (error) {
        res.status(400).json(error)
    }
})

app.post("/login", async (req, res)=>{
    const {username, password} = req.body 
    const userDoc = await User.findOne({username})
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if(passOk){
         jwt.sign({username, id:userDoc._id}, secrete, {}, (err, token)=>{
            if (err) throw err;
            res.cookie("token", token).json({
                id:userDoc._id,
                username,
            })
         } );
    }else{
        res.status(400).json("Wrong Credentials");
    }
})


app.get("/profile", (req, res)=>{
    const {token} = req.cookies;
    jwt.verify(token, secrete, {}, (err, info)=>{
        if(err) throw err;
        res.json(info)
    })
});

app.post("/logout", (req, res)=>{
    res.cookie("token", "").json("ok")
});

app.post("/post", uploadMiddleware.single("file"), async (req, res)=>{
    const {originalname, path} = req.file;
    const part = originalname.split(".");
    const ext = part[part.length - 1];
    const newPath = path+"."+ext;
    fs.renameSync(path, newPath);

    const {token} = req.cookies;
    jwt.verify(token, secrete, {}, async (err, info)=>{
        if(err) throw err;
        const {title, summary, content} = req.body;
        const PostDoc = await Post.create({
             title,
             summary,
             content,
             cover:newPath,
             author:info.id,
        })

        res.json(PostDoc);
    }) 

})


app.put("/post", uploadMiddleware.single("file"), async (req, res)=>{
  let newPath = null;
    if(req.file){
    const {originalname, path} = req.file;
    const part = originalname.split(".");
    const ext = part[part.length - 1];
    newPath = path+"."+ext;
    fs.renameSync(path, newPath);
  }
  const {token} = req.cookies
  jwt.verify(token, secrete, {}, async (err, info)=>{
    if(err) throw err;
    const {id, title, summary, content} = req.body;
    const PostDoc = await Post.findById(id)
    const isAuthor = JSON.stringify(PostDoc.author) === JSON.stringify(info.id);
    if(!isAuthor){
        res.status(400).json("you are not the author")
    }
    await PostDoc.updateOne({
        title, 
        summary, 
        content,
        cover: newPath ? newPath : PostDoc.cover,
    })
    res.json(PostDoc);
}) 
})

app.get("/post", async (req, res)=>{
    res.json(await Post.find().populate("author", ["username"]).sort({createdAt: -1}).limit(20))
})

app.get("/post/:id", async (req, res)=>{
   const {id} = req.params;
   const PostDoc = await Post.findById(id).populate("author", ['username'])
    res.json(PostDoc)
})
app.listen(4000) 