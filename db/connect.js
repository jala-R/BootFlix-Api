const mongoose=require("mongoose");



let res,rej;
let prom=new Promise((resP,rejP)=>{
    res=resP;
    rej=rejP;
})

mongoose.connect(process.env.DBURL)
.then(()=>{
    res();
    console.log("db connected..!");
})
.catch((err)=>{
    rej();
    console.log(err.message);
})

module.exports=prom;