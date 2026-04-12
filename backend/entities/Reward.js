import { DataTypes } from 'sequelize';
import sequelize from '../dbConfig.js';

const Reward = sequelize.define('Reward', {
  RewardId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  desc: { type: DataTypes.STRING, allowNull: false },
  points: { type: DataTypes.INTEGER, allowNull: false },
  image: { type: DataTypes.STRING, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: false, defaultValue: "Dining" },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'Rewards',
  timestamps: true
});

export default Reward;
