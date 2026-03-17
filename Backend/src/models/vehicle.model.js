import mongoose, { mongo } from "mongoose";
 
const vehicleSchema = new mongoose.Schema({
    make:{
        type:String,
        required:true,
    },
    model:{
        type:String,
        required:true,
    },
    color:{
        type:String,
        required:true,
    },
    year:{
        type:Number,
        required:true,
    },
    plate:{

    },
    vehicleType:{
        type:String,

    },
    capacity:{
        type:Number,
        
    },
    vehiclePhoto:{

    },
    rc:{

    },
    insurance:{

    },
    puc:{

    },
    permit:{

    },
    vehicleVerified:{

    },
    verificationNote:{

    }

},{timestamps:true});