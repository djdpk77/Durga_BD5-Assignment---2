const express = require('express');
const { resolve } = require('path');
let { sequelize } = require('./lib/index');

const app = express();

let { department } = require('./models/department.model');
let { role } = require('./models/role.model');
let { employee } = require('./models/employee.model');
let { employeeDepartment } = require('./models/employeeDepartment.model');
let { employeeRole } = require('./models/employeeRole.model');
let { Op } = require('@sequelize/core');
const { where } = require('sequelize');

app.use(express.json());

// Endpoint to seed database
app.get('/seed_db', async (req, res) => {
  await sequelize.sync({ force: true });

  const departments = await department.bulkCreate([
    { name: 'Engineering' },
    { name: 'Marketing' },
  ]);

  const roles = await role.bulkCreate([
    { title: 'Software Engineer' },
    { title: 'Marketing Specialist' },
    { title: 'Product Manager' },
  ]);

  const employees = await employee.bulkCreate([
    { name: 'Rahul Sharma', email: 'rahul.sharma@example.com' },
    { name: 'Priya Singh', email: 'priya.singh@example.com' },
    { name: 'Ankit Verma', email: 'ankit.verma@example.com' },
  ]);

  // Associate employees with departments and roles using create method on junction models
  await employeeDepartment.create({
    employeeId: employees[0].id,
    departmentId: departments[0].id,
  });
  await employeeRole.create({
    employeeId: employees[0].id,
    roleId: roles[0].id,
  });

  await employeeDepartment.create({
    employeeId: employees[1].id,
    departmentId: departments[1].id,
  });
  await employeeRole.create({
    employeeId: employees[1].id,
    roleId: roles[1].id,
  });

  await employeeDepartment.create({
    employeeId: employees[2].id,
    departmentId: departments[0].id,
  });
  await employeeRole.create({
    employeeId: employees[2].id,
    roleId: roles[2].id,
  });

  return res.json({ message: 'Database seeded!' });
});

// Helper function to get employee's associated departments
async function getEmployeeDepartments(employeeId) {
  const employeeDepartments = await employeeDepartment.findAll({
    where: { employeeId },
  });

  let departmentData;
  for (let empDep of employeeDepartments) {
    departmentData = await department.findOne({
      where: { id: empDep.departmentId },
    });
  }

  return departmentData;
}

// Helper function to get employee's associated roles
async function getEmployeeRoles(employeeId) {
  const employeeRoles = await employeeRole.findAll({
    where: { employeeId },
  });

  let roleData;
  for (let empRole of employeeRoles) {
    roleData = await role.findOne({
      where: { id: empRole.roleId },
    });
  }

  return roleData;
}

// Helper function to get employee details with associated departments and roles
async function getEmployeeDetails(employeeData) {
  const department = await getEmployeeDepartments(employeeData.id);
  const role = await getEmployeeRoles(employeeData.id);

  return {
    ...employeeData.dataValues,
    department,
    role,
  };
}

//Endpoint 1: Get All Employees
app.get('/employees', async (req, res) => {
  try {
    const employees = await employee.findAll();

    let employeeData = [];

    for (let emp of employees) {
      employeeData.push(await getEmployeeDetails(emp));
    }

    return res.status(200).json({ employees: employeeData });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

//Endpoint 2: Get Employee by ID
app.get('/employees/details/:id', async (req, res) => {
  try {
    let employeeFound = await employee.findOne({
      where: { id: req.params.id },
    });

    if (!employeeFound) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employeeData = await getEmployeeDetails(employeeFound);

    return res.status(200).json({ employee: employeeData });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

//Endpoint 3: Get Employees by Department
app.get('/employees/department/:departmentId', async (req, res) => {
  try {
    let departmentId = req.params.departmentId;

    let employeeDepartmentsFound = await employeeDepartment.findAll({
      where: { departmentId },
    });

    let employeeFound;
    let employeeData = [];

    for (let empDF of employeeDepartmentsFound) {
      employeeFound = await employee.findOne({
        where: { id: empDF.employeeId },
      });
      employeeData.push(await getEmployeeDetails(employeeFound));
    }

    return res.status(200).json({ employees: employeeData });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
});

//Endpoint 4: Get Employees by Role
app.get('/employees/role/:roleId', async (req, res) => {
  try {
    let roleId = req.params.roleId;

    let employeeRoleFound = await employeeRole.findAll({
      where: { roleId },
    });

    let employeeFound;
    let employeeData = [];

    for (let empRF of employeeRoleFound) {
      employeeFound = await employee.findOne({
        where: { id: empRF.employeeId },
      });
      employeeData.push(await getEmployeeDetails(employeeFound));
    }

    return res.status(200).json({ employees: employeeData });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

//Endpoint 5: Get Employees Sorted by Name
app.get('/employees/sort-by-name', async (req, res) => {
  try {
    const employees = await employee.findAll({
      order: [['name', 'ASC']],
    });

    let employeeData = [];

    for (let emp of employees) {
      employeeData.push(await getEmployeeDetails(emp));
    }

    return res.status(200).json({ employees: employeeData });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

//Function to create a new employee
async function createEmployee(employeeData) {
  let newEmployee = await employee.create(employeeData);

  return newEmployee;
}

//Endpoint 5: Add a New Employee
app.post('/employees/new', async (req, res) => {
  try {
    let employeeData = req.body;
    let newEmployee = await createEmployee(employeeData);

    let employeeDetails = await getEmployeeDetails(newEmployee);

    return res.status(201).json({ employee: employeeDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

//Endpoint 6: Update Employee Details
app.put('/employees/update/:id', async (req, res) => {
  try {
    let employeeId = req.params.id;
    let employeeData = req.body;

    let employeeFound = await employee.findOne({
      where: { id: employeeId },
    });

    if (!employeeFound) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employeeData.name) employeeFound.name = employeeData.name;
    if (employeeData.email) employeeFound.email = employeeData.email;
    if (employeeData.departmentId !== undefined) {
      await employeeDepartment.destroy({ where: { employeeId: employeeId } });

      await employeeDepartment.create({
        employeeId: employeeId,
        departmentId: employeeData.departmentId,
      });

      employeeFound.departmentId = employeeData.departmentId;
    }

    if (employeeData.roleId !== undefined) {
      await employeeRole.destroy({ where: { employeeId: employeeId } });

      await employeeRole.create({
        employeeId: employeeId,
        roleId: employeeData.roleId,
      });

      employeeFound.roleId = employeeData.roleId;
    }

    await employeeFound.save();

    let employeeDetails = await getEmployeeDetails(employeeFound);

    return res.status(200).json({ employee: employeeDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

//Endpoint 7: Delete Employee
app.delete('/employees/delete', async (req, res) => {
  try {
    let employeeId = req.body.id;

    let employeeFound = await employee.findOne({
      where: { id: employeeId },
    });

    if (!employeeFound) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await employeeFound.destroy();
    await employeeDepartment.destroy({ where: { employeeId: employeeId } });
    await employeeRole.destroy({ where: { employeeId: employeeId } });

    return res.status(200).json({
      message: 'Employee with ID ' + employeeId + ' has been deleted',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
