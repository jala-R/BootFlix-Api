const mongoose=require("mongoose");


const movieSchema=new mongoose.Schema({
    movieName:{
        type:String,
        required:true
    },
    movieDesc:{
        type:String,
        required:true
    },
    genre:{
        type:String,
        required:true,
    },
    language:{
        type:String,
        required:true,
    },
    duration:{
        type:String,
        required:true,
    },
    year:{
        type:String,
        required:true,
    },
    limit:{
        type:String,
        required:true,
    },
    titleImage:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    thumnailImage:{
        type:String,
        required:true,
    },
    movie:{
        type:String,
        required:true,
    },
    trailer:{
        type:String,
        required:true,
    },
    subtitle:{
        type:[String],
        required:true,
    },
    plan:{
        type:String,
        required:true,
        enum:["Free","Standard","Preminum"]
    }
},{
    timestamps:true
})

const Movie=mongoose.model("movie",movieSchema);

module.exports=Movie;