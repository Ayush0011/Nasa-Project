const axios = require('axios');
const launchesDatabase = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';


// const launch = {
//      flightNumber : 100, //flight_number
//      mission : 'Kepler Exploration X', //name
//      rocket : 'Explorer IS1', //rocket.name
//      launchDate : new Date('December 27, 2030'), //date_local
//      target : 'Kepler-442 b', //not applicable
//      customer : ['ZTM', 'NASA'], //payload.customers for each payload
//      upcoming : 'true', //upcoming
//      success : 'true', //success
// };



// saveLaunch(launch);

async function populateData(){
    console.log("Downloading launches data ....");
    const response = await axios.post(SPACEX_API_URL,{
        query:{},
        options:{
            pagination:false,
            populate:[
                {
                    path:'rocket',
                    select:{
                        name:1
                    }
                },
                {
                    path:'payloads',
                    select:{
                         customers:1
                    }
                }
            ]
        }
    });

    if(response.status!==200){
        console.log('Problem in downloading launch data!!');
        throw new Error('Download launch data failed');
    }

    const launchDocs = response.data.docs;
    for(const launchDoc of launchDocs){
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload)=>{
            return payload['customers'];
        });

        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers,
        };

        console.log(`${launch.flightNumber} ${launch.mission}`);
        //TODO : populate lauches data !!
        await saveLaunch(launch);
    }
}

async function loadLaunchesData(){
    const firstLaunch = await findLaunch({
        flightNumber:1,
        rocket:'Falcon 1',
        mission:'FalconSat',
    });
    if(firstLaunch){
        console.log('Launch data already loaded !!');
    }else{
       await populateData();
    }   
}

async function findLaunch(filter){
    return await launchesDatabase.findOne(filter);
}

async function existsLaunchWithId(launchId){
    return await findLaunch({
        flightNumber : launchId,
    });
}

async function saveLaunch(launch){
    await launchesDatabase.findOneAndUpdate({
        flightNumber : launch.flightNumber,
    }, launch , {
        upsert : true,
    });
}



async function getLatestFlightumber(){
    const latestLaunch = await launchesDatabase
    .findOne()
    .sort('-flightNumber');

    if(!latestLaunch){
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip,limit){
    return await launchesDatabase.find({},{'_id':0,'__v':0})
    .sort({flightNumber:1})
    .skip(skip)
    .limit(limit);
}

async function scheduleNewLaunch(launch){
    const planet = await planets.findOne({
        kepler_name : launch.target,
    });

    if(!planet){
        throw new Error('No matching Planet Found');
    }

    const newFlightNumber =  await getLatestFlightumber() + 1;
    const newLaunch = Object.assign(launch,{
                success : true,
                upcoming : true,
                customers : ['Zero to Mastery','NASA'],
                flightNumber : newFlightNumber,
                });
    await saveLaunch(newLaunch);            

}

// function addNewLaunch(launch){
//       latestFlightNumber++;
//       launches.set(latestFlightNumber,
//         Object.assign(launch,{
//             flightNumber : latestFlightNumber,
//             success : true,
//             upcoming : true,
//             customer : ['Zero to Mastery','NASA'],
//         }));
// }

async function abortLaunchById(launchId){

    const aborted = await launchesDatabase.updateOne({
        flightNumber : launchId,
    },{
        upcoming : false,
        success : false,
    });

    return aborted.modifiedCount ===1;
    //  const aborted = launches.get(launchId);
    //  aborted.success = false;
    //  aborted.upcoming = false;
    //  return aborted;
}

module.exports = {
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithId,
    abortLaunchById,
    loadLaunchesData,
};