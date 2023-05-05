const express = require("express");
const bodyParser = require("body-parser");
const Router = require("./router");
const cors = require("cors");



const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.use(cors());
app.use(express.json());   //! I literally wasted a week on just figuring out why my frontend is not able to send data to my backend . Even ChatGpt was not able to figure it out . Am not gonna forget it from the next time for sure. Naa jaaane kya kya try karr rhe the aur aakhir me niklya kya (Sarcastic smile emoji).Khoda pahaad nikla chooha   ............. Uuuuurrrrrghhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
                                       

app.use(express.static("public"));
app.set("view engine" , "ejs");
app.use(Router);


app.get("/" , function(req,res){
    res.sendFile("index.html");
})






app.listen(8005 , function(err){
    if(!err){
        console.log(`server started on port ${8005}` );
    }
});
