let count =0;
 
const viewCount =(req,res,next)=>{
    count++;
    console.log(count); 

//    res.send('good that')

next()
};

module.exports=viewCount;