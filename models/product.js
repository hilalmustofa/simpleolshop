const mongoose = require('mongoose');


const productSchema = mongoose.Schema({
    _id: {type: String},
    name: {type: String, required: true},
    description: {type: String, required: true},
    price: {type: String, required: true},
    picture: {type: String, required: true} 
})

module.exports = mongoose.model('Product', productSchema)