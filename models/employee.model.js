let { DataTypes, sequelize } = require('./../lib/index');

let employee = sequelize.define('employee', {
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
});

module.exports = { employee };
