const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const planets = require('./planets.mongo');

// const habitablePlanets = [];


function isHabitablePlanet(planet){
    return planet['koi_disposition']=='CONFIRMED' && planet['koi_insol']>0.36
    && planet['koi_insol']<1.11 && planet['koi_prad']<1.6;
}
function loadPlanetsData(){
   return new Promise((resolve,reject)=>{ 
   fs.createReadStream(path.join(__dirname,'..','..','data','kepler_data.csv'))
    .pipe(parse({
        comment: '#',
        columns: true,
    }))
    .on('data', (data)=>{
        if(isHabitablePlanet(data)){
            savePlanet(data);
        }
    })
    .on('error',(err)=>{
        console.log(err.message);
        reject(err);
    })
    .on('end' , async ()=>{
        const planetCount = (await getAllPlanets()).length;
        console.log(`${planetCount} planets are found`)
        resolve();
    });
 });
}
 async function getAllPlanets(){
    return  await planets.find({});
 }

async function savePlanet(planet){
    try{
        await planets.updateOne({
            'kepler_name' : planet.kepler_name,
        },{
            'kepler_name' : planet.kepler_name,
        },{
            upsert : true,
        });
    }
    catch(err){
        console.log(`Could not save planet ${err}`);
    }
} 


module.exports={
    loadPlanetsData,
    getAllPlanets,
}