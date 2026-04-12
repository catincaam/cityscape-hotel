import { DataTypes } from 'sequelize';
import sequelize from '../dbConfig.js';

const Admin = sequelize.define('Admin', {
  AdminId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'Admins',
  timestamps: false
});

export default Admin;
