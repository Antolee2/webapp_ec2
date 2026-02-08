const app=require('./index');
app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
});