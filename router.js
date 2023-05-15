const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const { name } = require("ejs");
const bcrypt = require("bcrypt");
const { error } = require("console");
const ObjectId = mongoose.Types.ObjectId;

mongoose.set("strictQuery", false);
// mongoose.connect("mongodb+srv://MONGO:8896483413@atlascluster.ofjjvzm.mongodb.net/shopDB");
mongoose.connect("mongodb://127.0.0.1/shopDB");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });



const billSchema = new mongoose.Schema({
    partyName: String,
    partyCode: String,
    billNo: String,
    billDate: String,
    billAmount: Number
});




const mrDetailsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sysName: { type: String, required: true },
    company: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phoneNumber1: { type: String, required: true },
    phoneNumber2: { type: String },
    bills: [billSchema]
})


const schema = new mongoose.Schema({
    id: { type: Number, default: 1 },
    mrDetails: [mrDetailsSchema],
    deletedBills: [billSchema]
})


const myModel = mongoose.model("myData", schema);



const workSheets = {};

function linearSearch(array, numberToBeSearched, name) {
    let b = 0;
    let pos = 0;
    for (let i = 0; i < array.length; i++) {
        if (array[i][name] === numberToBeSearched) {
            b = b + 1;
            pos = i;
        }
    }
    if (b > 0) {
        return {
            status: true,
            position: pos
        };
    }
    else {
        return {
            status: false
        };
    }

}


//** BACKEND ROUTES **//


router.get("/dataAnalysis", async function (req, res) {
    const a = await myModel.find({})
    res.send(a);
});

router.get("/shop/salesman/register", function (req, res) {

    res.sendFile(__dirname + "/public/smRegister.html");
})

router.get("/bills/mrwise/:mrName", async function (req, res) {
    const mrName = req.params.mrName;
    const details = await myModel.find({});
    const pos = linearSearch(details[0]["mrDetails"], mrName, "name");
    res.render("mrIDcard", { data: details[0]["mrDetails"][pos.position] })
})


router.get("/details/update/:mrName", async function (req, res) {
    const { mrName } = req.params;
    const details = await myModel.find({});
    const pos = linearSearch(details[0]["mrDetails"], mrName, "name");
    res.render("mrDetailUpdate", { data: details[0]["mrDetails"][pos.position] });
})


router.get("/bills/mrwise/delete/:mrName/:billNo", async function (req, res) {
    const { mrName, billNo } = req.params;

    const fullData = await myModel.find({});
    const deletedBills = fullData[0]["deletedBills"];

    const billSearch1 = linearSearch(fullData[0]["mrDetails"], mrName, "name");

    const billSearch2 = linearSearch(fullData[0]["mrDetails"][billSearch1.position]["bills"], billNo, "billNo")
    // const billSearch = linearSearch(fullData["mrDetails"][mrName]["bills"] , billNo , "billNo");

    const bill = fullData[0]["mrDetails"][billSearch1.position]["bills"][billSearch2.position];


    // myModel.updateOne({} , {$push:{"deletedBills":bill}});
    const myId = new mongoose.Types.ObjectId(fullData[0]["_id"]);
    await myModel.findOneAndUpdate({ _id: myId }, { $push: { "deletedBills": bill } })



    myModel.findOneAndUpdate({
        "mrDetails.name": mrName
    }, {
        $pull: {
            "mrDetails.$.bills": {
                "billNo": billNo
            }
        }
    }, {
        new: true
    }).then((result) => {
        // res.send('<script>location.reload()</script>');

    }).catch((err) => {
        console.log(err);
    });

    res.redirect("/bills/mrwise/" + mrName);
});




router.get("/bills/mrWise", async function (req, res) {
    // const mrName = req.params.mrName;
    const details = await myModel.find({});

    // const pos = linearSearch(details[0]["mrDetails"] , mrName , "name");
    res.render("index.ejs", { data: details[0]["mrDetails"] });

})

router.get("/bills/deleted", async (req, res) => {
    const fullData = await myModel.find({});
    const data = fullData[0]["deletedBills"]
    res.render("deletedBills.ejs", { data: data });
});

router.get("/bills/deletedBills/:billNo/:id", async (req, res) => {
    const { billNo, id } = req.params;
    const billId = new ObjectId(id);
    await myModel.findOneAndUpdate({}, { $pull: { "deletedBills": { "_id": billId } } }, { new: true });
    res.json({ message: "Bill Deleted" })
})

router.post("/", upload.single("myFile"), async function (req, res) {
    const workbook = XLSX.readFile(`uploads/${req.file.filename}`);
    workSheets["Sheet1"] = XLSX.utils.sheet_to_json(workbook["Sheets"]["Sheet1"]);
    let data = workSheets["Sheet1"];
    const salesmanData = await myModel.find({});
    const deletedBills = salesmanData[0]["deletedBills"];


    for (let i = 0; i < data.length - 3; i++) {
        let trimmedKeys = (data[i][Object.keys(data[i])[6]] + "").trim();                  // stores if the bill was made in cash or not.
        let trimmedSNo = (data[i][Object.keys(data[i])[0]] + "").trim();                   // stores the serial number
        let trimmedBillNo = (data[i][Object.keys(data[i])[1]] + "").trim();
        let trimmedBillDate = (data[i][Object.keys(data[i])[2]] + "").trim();
        let c = 0;

        if (trimmedSNo.length !== 0) {                                                     // there are cases in excel sheets that dates are given between the data so it is necessary to remove them and since that line does not have any serial number , so, we use this line of code.
            if (trimmedKeys.length === 0) {
                if (salesmanData.length !== 0) {
                    if (deletedBills.length !== 0) {
                        const deletedBillsSearch = linearSearch(deletedBills, trimmedBillNo, "billNo")   //this code search whether the bill has been already deleted earlier , if yes then that bill wont be added  
                        if (deletedBillsSearch.status === true ) {
                            
                        }
                        else{
                            function billDataAdding(mrName, mrName2) {
                                if ((data[i][Object.keys(data[i])[5]] + " ").trim() === mrName) {  //checks the mr name of the bill

                                    const result = linearSearch(salesmanData[0]["mrDetails"], mrName2, "name" /*array-in-which-searching-is-to-be-done    what-is-to-be-searched    which-field-of-object*/);
                                    if (result.status === false) {

                                    }
                                    else {
                                        const secondResult = linearSearch(salesmanData[0]["mrDetails"][result.position]["bills"], data[i][Object.keys(data[i])[1]], "billNo")
                                        if (secondResult.status === false) {
                                            myModel.findOneAndUpdate({
                                                "mrDetails.name": mrName2              // this peice of code basically says that if the name is same then add the below bill into the bill array of this mr.
                                            }, {
                                                $push: {
                                                    "mrDetails.$.bills": {

                                                        billNo: data[i][Object.keys(data[i])[1]],
                                                        billDate: data[i][Object.keys(data[i])[2]],
                                                        billAmount: data[i][Object.keys(data[i])[7]],
                                                        partyName: data[i][Object.keys(data[i])[4]],
                                                        partyCode: data[i][Object.keys(data[i])[3]]
                                                    }
                                                },
                                            }, { new: true }).then((result) => { }).catch((err) => { console.log(err); })
                                        }
                                        else {

                                        }
                                    }



                                }


                            }

                            for (let i = 0; i < salesmanData[0]["mrDetails"].length; i++) {
                                billDataAdding(salesmanData[0]["mrDetails"][i]["sysName"], salesmanData[0]["mrDetails"][i]["name"]);
                            }
                        }
                    }

                }
                else {
                    console.log("no data");
                }
            }
        }

    }
    res.redirect("/bills/mrwise")

});

router.get("/deletedBills", async function (req, res) {

})


router.post("/dataforgraph", upload.single("myFile"), async function (req, res) {

})


router.post("/shop/salesman/register", async function (req, res) {
    const { cPassword, username, sysName, password, company, email, PN1, PN2 } = req.body
    if (!username || !sysName || !email || !company || !PN1 || !PN2 || !password || !cPassword) {
        res.status(422).json({ error: "fill all the data" });
    }
    else {

        if (password === cPassword) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt)
            const obj = {
                name: username,
                sysName: sysName,
                company: company,
                email: email,
                password: hashedPassword,
                phoneNumber1: PN1,
                phoneNumber2: PN2,
                bills: []
            }

            const myDoc = await myModel.find({})
            if (myDoc.length === 0) {
                const item = new myModel({
                    mrDetails: [obj]
                })
                item.save()
            }
            else {
                myModel.updateOne({ "id": 1 });
                myModel.updateOne({ "mrDetails.0": { $exists: true } },
                    { $push: { "mrDetails": obj } }).then((result) => { console.log(result); }).catch((err) => { console.log(err); })
            }
            const myDoc2 = await myModel.find({});
            res.send(myDoc2)
        }
        else {
            res.status(422).json({ error: "confirm password and password does not match" });
        }
    }


})


// ** FRONTEND PART **//


router.post("/mr/login", async (req, res) => {
    console.log(req.body);

    // res.send(req.body)

    if (req.body.email !== undefined) {
        const { email, password } = req.body;
        const details = await myModel.find({});
        const match = linearSearch(details[0]["mrDetails"], email, "email")
        if (match.status === true) {
            const isMatch = await bcrypt.compare(password, details[0]["mrDetails"][match.position]["password"]);
            if (isMatch) {
                res.status(201).json(details[0]["mrDetails"][match.position])
            }
            else {
                res.status(404).json({ error: "Username and Password doesn't match" })
            }
        }
        else {
            res.status(404).json({ error: "User Not Found" })
        }
    }

});

router.post("/dataforanalysis", upload.single("myFile"), async (req, res) => {
    const workbook = XLSX.readFile(`uploads/${req.file.filename}`);
    workSheets["Sheet1"] = XLSX.utils.sheet_to_json(workbook["Sheets"]["Sheet1"]);
    let data = workSheets["Sheet1"];
    res.send(data)
    console.log(data)
})

router.get("/mrDataDisplay/:company/:id", async (req, res) => {
    const { company, id } = req.params;

    const data = await myModel.find({})
    const myId = new mongoose.Types.ObjectId(id);
    const result = linearSearch(data[0]["mrDetails"], myId, "_id");
    // console.log(data[0]["mrDetails"] , myId);/
    for (let i = 0; i < data[0]["mrDetails"].length; i++) {
        const realId = myId.equals(data[0]["mrDetails"][i]["_id"])
        // console.log(realId);
        if (realId) {
            res.status(200).json({ "data": data[0]["mrDetails"][i] })
        }
    }
})




module.exports = router;