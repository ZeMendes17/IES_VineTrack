import Container from "@mui/material/Container";
import Grid from "@mui/material/Unstable_Grid2";
import Typography from "@mui/material/Typography";

import AppNutritionChart from "../app-nutrition-chart";
import AppHumidityChart from "../app-humidity-chart";
import AppTemperatureChart from "../app-temperature-chart";
import AppEnvironmentalImpactChart from "../app-environmentalimpact-chart";

import { fetchData, postData, updateData } from "src/utils";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { Box, Card, CardHeader, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, Stack, TextField } from "@mui/material";
import Iconify from "src/components/iconify";
import { styled } from '@mui/system';
import clsx from 'clsx';
import { FormControl, useFormControlContext } from '@mui/base/FormControl';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

// ----------------------------------------------------------------------

export default function VineDetailsView() {

  const { id } = useParams();
  const [vine, setVine] = useState({});
  
  const [moistureData, setMoistureData] = useState(null);
  const [tempData, setTempData] = useState([]);
  const [weatherAlertsData, setWeatherAlertsData] = useState([]);

  const [currentDay, setCurrentDay] = useState(new Date().getDate());

  const [waterLimit, setWaterLimit] = useState('');
  const [errorWaterLimit, setErrorWaterLimit] = useState('');


  const [vineId, setVineId] = useState(null);
  const [size, setSize] = useState(null);

  const [avgTempsByDay, setAvgTempsByDay] = useState([]);
  const [avgTempsByWeek, setAvgTempsByWeek] = useState([]);

  useEffect(() => {
    const initialize = async () => {
      const res = fetchData(`vines/${id}`);

      res.then((data) => {
        setVine(data);
        setVineId(data.id);
        setSize(data.size);
        setWaterLimit(data.maxWaterConsumption)
        console.log("Vine data fetched: ", data);
      });
    }

    initialize();
  }, []);



  useEffect(() => {
    const res = fetchData(`vines/moisture/${id}`);
    res.then((response) => {
      if (response) {
        console.log("Moisture data fetched");
        
        // moisture is a list of doubles
        const moisture = response;
        const moistureData = moisture.map((value, index) => {
          return value;
        });
        setMoistureData(moistureData);
      } else {
        console.log("Moisture data failed");
      }
    });

    fetchData(`vines/temperature/${id}`)
      .then(response => {
        if (response) {
          console.log("Temperature data fetched");
          
          const labels = Object.keys(response);
          const values = Object.values(response);

          setTempData(labels.map((value, index) => {
            return {[value]: values[index]};
          }).sort((a, b) => Object.keys(b)[0] - Object.keys(a)[0]));

          
        } else {
          console.log("Temperature data failed");
        }
      });

    fetchData(`vines/weatherAlerts/${id}`)
    .then(response => {
      if (response) {
        console.log("Weather Alerts data fetched");
      
        const labels = Object.keys(response);
        const values = Object.values(response);
        setWeatherAlertsData(labels.map((value, index) => {
          return {
            type: value,
            level: values[index][2],
            startTime: values[index][0],
            endTime: values[index][1]
          };
        }));
      } else {
        console.log("Temperature data failed");
      }
    });
  
    fetchData(`vines/avgTemperatureByDay/${id}`)
      .then(response => {
        if (response) {
          console.log("Average Temperature data fetched");

          const labels = Object.keys(response);
          const values = Object.values(response);

          setAvgTempsByDay(labels.map((value, index) => {
            return {[value]: values[index]};
          }));

        }
    });

    fetchData(`vines/avgTemperatureByWeek/${id}`)
      .then(response => {
        if (response) {
          console.log("Average Temperature data fetched");

          const labels = Object.keys(response);
          const values = Object.values(response);

          setAvgTempsByWeek(labels.map((value, index) => {
            return {[value]: values[index]};
          }));

        }
    });

  }
  , [id]);

  useEffect(() => {
    const today = new Date().getDate();
    if (today !== currentDay) {
      setTempData([]);
      setCurrentDay(today);
    }
  }, [currentDay]);

  // websocket
  const [latestValue, setLatestValue] = useState(null);
  useEffect(() => {
    const today = new Date().getDate();
    if (today !== currentDay) {
      setTempData([]);
      setCurrentDay(today);
    }
    const ws = new SockJS("http://localhost:8080/vt_ws");
    const client = Stomp.over(ws);
    client.connect({}, function () {
      client.subscribe('/topic/update', function (data) {
        if (JSON.parse(data.body).id == id) {
          setLatestValue(JSON.parse(data.body).value);
          if (JSON.parse(data.body).sensor == "temperature") {
            const newtempData = [...tempData];

            if (!newtempData.map((value, index) => {return Object.keys(value)[0]}).includes(JSON.parse(data.body).date)) {
              newtempData.push({[JSON.parse(data.body).date]: JSON.parse(data.body).value});
              setTempData(newtempData.sort((a, b) => Object.keys(b)[0] - Object.keys(a)[0]));


              fetchData(`vines/avgTemperatureByDay/${id}`)
                .then(response => {
                  if (response) {
                    console.log("Average Temperature data fetched");
        
                    const labels = Object.keys(response);
                    const values = Object.values(response);
        
                    setAvgTempsByDay(labels.map((value, index) => {
                      return {[value]: values[index]};
                    }));
        
                  }
              });
              
              fetchData(`vines/avgTemperatureByWeek/${id}`)
                .then(response => {
                  if (response) {
                    console.log("Average Temperature data fetched");
        
                    const labels = Object.keys(response);
                    const values = Object.values(response);
        
                    setAvgTempsByWeek(labels.map((value, index) => {
                      return {[value]: values[index]};
                    }));
        
                  }
              });
            }

            console.log("New temperature data: ", newtempData);
            
          }
          if (JSON.parse(data.body).sensor == "moisture") {
            const newMoistureData = [...moistureData];
            newMoistureData.shift();
            newMoistureData.push(JSON.parse(data.body).value);
            console.log("New moisture data: ", newMoistureData);
            setMoistureData(newMoistureData);
          }
          if (JSON.parse(data.body).sensor == "weatherAlerts") {
            console.log("New weather alert: ", JSON.parse(data.body).value);
            
            const obj =  JSON.parse(data.body).value;
            const json = obj.replace(/'/g, '"');
            const obj2 = JSON.parse(json);

            const labels = Object.keys(obj2);
            const values = Object.values(obj2);

            setWeatherAlertsData(labels.map((value, index) => {
              return {
                type: value,
                level: values[index][2],
                startTime: values[index][0],
                endTime: values[index][1]
              };
            }));
          }
        }
      });
    });
  }
  , [id, moistureData], [id, tempData], [id, weatherAlertsData]);

  console.log("Moisture", moistureData);
  console.log("Temperature", tempData);
  console.log("Latest value: ", latestValue);
  console.log("Weather Alerts: ", weatherAlertsData);
  console.log("Average Temperature by day: ", avgTempsByDay);


  const handleUpdateWaterLimit = (e) => {
    e.preventDefault();

    console.log("Handling water limit update...")

    if (!waterLimit) {
      setErrorWaterLimit('Value cannot be empty');
    } else if (parseFloat(waterLimit) < 0) {
      setErrorWaterLimit('Value must be positive');
    } else if (isNaN(parseFloat(waterLimit))) {
      setErrorWaterLimit('Value must be a number');
    } else {
      // Validation passed, you can proceed with your form submission logic
      setErrorWaterLimit('');
      setWaterLimit(parseFloat(waterLimit));
      console.log("Vine id: ", vineId);
      // pass the water limit to a double
      const newWaterLimit = parseFloat(waterLimit);
      console.log("Water limit in frontend updated to ", newWaterLimit);
      // Send data to backend
      if (vineId !== undefined && Number.isInteger(vineId)) {
        const res = updateData(`vines/waterLimit/${vineId}`, { waterLimit: newWaterLimit }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        console.error("Invalid vineId:", vineId);
      }
      

      // Close the modal
      handleCloseWaterLimit();
    }
  };
  // Modal

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [openWaterLimit, setOpenWaterLimit] = useState(false);
  const handleOpenWaterLimit = () => setOpenWaterLimit(true);
  const handleCloseWaterLimit = () => setOpenWaterLimit(false);
  
  const [openProduction, setOpenProduction] = useState(false);
  const handleOpenProduction = () => setOpenProduction(true);
  const handleCloseProduction = () => setOpenProduction(false);

  const [dateProduction, setDateProduction] = useState("");
  const [production, setProduction] = useState("");

  const [alertDateProduction, setAlertDateProduction] = useState(false)
  const [alertProduction, setAlertProduction] = useState(false);



  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    // width: 600,
    bgcolor: 'background.paper',
    // border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  // Form
  
  const Label = styled(({ children, className }) => {
    const formControlContext = useFormControlContext();
    const [dirty, setDirty] = useState(false);
  
    useEffect(() => {
      if (formControlContext?.filled) {
        setDirty(true);
      }
    }, [formControlContext]);
  
    if (formControlContext === undefined) {
      return <p>{children}</p>;
    }
  
    const { error, required, filled } = formControlContext;
    const showRequiredError = dirty && required && !filled;
  
    return (
      <p className={clsx(className, error || showRequiredError ? 'invalid' : '')}>
        {children}
        {required ? ' *' : ''}
      </p>
    );
  })`
    font-family: 'IBM Plex Sans', sans-serif;
    margin-bottom: 4px;
  
    &.invalid {
      color: red;
    }
  `;

  // Form Control
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!value) {
      setError('Value cannot be empty');
    } else if (parseFloat(value) < 2 || parseFloat(value) > 4) {
      setError('Value must be between 2.0 and 4.0');
    } else if (isNaN(parseFloat(value))) {
      setError('Value must be a number');
    } else {
      // Validation passed, you can proceed with your form submission logic
      setError('');
      // Send data to backend
      const res = postData(`vines/ph/${id}?value=${value}`);
      res.then((response) => {
        if (response) {
          console.log("PH value added", response);
          const newPhValues = [...phValues];
          // put the new value in the first position
          newPhValues.unshift(response);
          // if the list has more than 5 values, remove the last one
          if (newPhValues.length > 5) {
            newPhValues.pop();
          }
          setPhValues(newPhValues);
          setValue('');

          // check if all values are between 2.9 and 3.5
          const allValues = newPhValues.map((value, index) => {return value.value});
          const allValuesValid = allValues.every((value, index) => {return value >= 2.9 && value <= 3.5});
          if (allValuesValid && newPhValues.length == 5) {
            // if they are, send notification
            const res = postData(`vines/harvest/${id}`);
            res.then((response) => {
              if (response) {
                console.log("Notification sent");
              } else {
                console.log("Notification failed");
              }
            });
          }
        } else {
          console.log("PH value failed");
        }
      }
      , [id]);
      // Close the modal
      handleClose();
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    setError(''); // Clear error message on input change
  };

  const handelSubmitProduction = (e) => {
    e.preventDefault();
    
    if (!production || production < 0) {
      setAlertProduction(true);
    }else {
      setAlertProduction(false);
    }
    if (!dateProduction) {
      setAlertDateProduction(true);
    }else{
      setAlertDateProduction(false);
    }

    if (production > 0 && production && dateProduction) {
      const res = postData(`vines/production/${id}?value=${production}&date=${dateProduction}`);
      console.log("p ", production);
      console.log("d ", dateProduction);
      console.log("res ", res);
      res.then((response) => {
        if (response) {
          console.log("Production value added", response);
          setProduction('');
        } else {
          console.log("Production value failed");
        }
      }
      , [id]);
      // Close the modal
      handleCloseProduction();
    }
    
  };



  const renderForm = (
    <>
      <FormControl>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Label sx={{ fontSize: '16px' }}>Value:</Label>
          <TextField
            value={value}
            onChange={handleInputChange}
            error={!!error}
            helperText={error}
            sx={{ width: '100%' }}
          />
        </Stack>
        <Box display="flex" justifyContent="flex-end">
          <Button type="submit" variant="contained" color="inherit" sx={{ mt: 3 }}
          onClick={handleSubmit}>
            Submit
          </Button>
        </Box>
      </FormControl>
    </>
  );

  const handleInputChangeWaterLimit = (e) => {
    const newValue = e.target.value;
    setWaterLimit(newValue);
    setErrorWaterLimit(''); // Clear error message on input change
  };

  const renderFormWaterLimit = (
    <>
      <FormControl>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Label sx={{ fontSize: '16px' }}>Value:</Label>
          <TextField
            value={waterLimit}
            onChange={handleInputChangeWaterLimit}
            error={!!errorWaterLimit}
            helperText={errorWaterLimit}
            sx={{ width: '100%' }}
          />
        </Stack>
        <Box display="flex" justifyContent="flex-end">
          <Button type="submit" variant="contained" color="inherit" sx={{ mt: 3 }}
          onClick={handleUpdateWaterLimit}>
            Submit
          </Button>
        </Box>
      </FormControl>
    </>
  );

  // PH Values
  const [phValues, setPhValues] = useState([]);
  useEffect(() => {
    fetchData(`vines/ph/${id}`)
      .then(response => {
        if (response) {
          console.log("PH Values data fetched");
          setPhValues(response);
        } else {
          console.log("PH Values data failed");
        }
      });
  }
  , [id]);

  // Water Consumption Weekly
  const [waterConsumptionWeekly, setWaterConsumptionWeekly] = useState([]);
  useEffect(() => {
    fetchData(`vines/waterConsumptionWeek/${id}`)
      .then(response => {
        if (response) {
          console.log("Water Consumption Weekly data fetched");
          setWaterConsumptionWeekly(response);
        } else {
          console.log("Water Consumption Weekly data failed");
        }
      });
  }
  , [id]);

  // Water Consumption Weekly - websocket
  useEffect(() => {
    const ws = new SockJS("http://localhost:8080/vt_ws");
    const client = Stomp.over(ws);
    client.connect({}, function () {
      client.subscribe('/topic/waterConsumptionWeek', function (data) {
        if (JSON.parse(data.body).vineId == id) {
          console.log("New water consumption weekly data: ", JSON.parse(data.body).waterConsumptionWeekValues);
          // we receive a list of doubles
          const waterConsumptionWeekly = JSON.parse(data.body).waterConsumptionWeekValues;
          setWaterConsumptionWeekly(waterConsumptionWeekly);
        }
      }
      );
    });
  }
  , [id, waterConsumptionWeekly]);

  // Water Consumption Limit
  useEffect(() => {
    fetchData(`vines/waterLimit/${vineId}`)
      .then(response => {
        if (response) {
          console.log("Water Consumption Limit data fetched");
          setWaterLimit(response);
        } else {
          console.log("Water Consumption Limit data failed");
        }
      });
  }
  , [id]);

  return (
    <Container maxWidth="xl">
      <Typography variant="h3" sx={{ mb: 5 }}>
        Overview of {vine.name}
      </Typography>
      <Grid container>
      <Grid item xs={6}>
        <Typography variant="h5" sx={{ mb: 5 }}>Water Consumption Limit: {waterLimit} L</Typography>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Button
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="eva:edit-fill" />}
              onClick={handleOpenWaterLimit}
            >
              Edit Consumption Limit
            </Button>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={6} justifyContent="flex-end">
        <Typography variant="h5" sx={{ mb: 5 }}>Production Level</Typography>
        <Grid container alignItems="center">
          <Grid item >
            <Button
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="eva:edit-fill" />}
              onClick={handleOpenProduction}
            >
              Add Production Information
            </Button>
          </Grid>
        </Grid>
      </Grid>
      </Grid>

      <br></br>
      <br></br>

      <Typography variant="h5" sx={{ mb: 5 }}>
        Sensor Data
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} md={6} lg={8}>
          <AppHumidityChart
            title="Humidity"
            subheader=" in Percentage (%)"
            chart={{
              labels: [
                "9h ago",
                "8h ago",
                "7h ago",
                "6h ago",
                "5h ago",
                "4h ago",
                "3h ago",
                "2h ago",
                "1h ago",
                "NOW",
              ],
              series: [
                {
                  name: "Humidity",
                  type: "line",
                  fill: "solid",
                  data: moistureData,
                },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={4}>
          <AppNutritionChart
            title="Nutrition Values"
            chart={{
              series: [
                { label: "Nitrogen (N)", value: 48.0 },
                { label: "Phosphorus (P)", value: 11.3 },
                { label: "Potassium (K)", value: 21.3 },
                { label: "Magnesium (Mg)", value: 19.5 },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={8}>
          <AppTemperatureChart
            title="Temperature"
            subheader=" in Celsius (°C)"
            chart={{
              labels: tempData.map((value, index) => {return Object.keys(value)[0]}),
              series: [
                {
                  name: "Temperature",
                  type: "line",
                  color: "#FF0000",
                  fill: "solid",
                  data: tempData.map((value, index) => { return Object.values(value)[0]})
                },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={4}>
            <Card>
              <CardHeader title='Average Temperature'  />
              <Box sx={{ p: 2, pb: 1 }}>
                {avgTempsByDay.length > 0 && 
                  <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Day</TableCell>
                        <TableCell >Average Temperature</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {avgTempsByDay.map((value) => (
                        <TableRow
                          key={Object.keys(value)[0]}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {Object.keys(value)[0]}
                          </TableCell>
                          <TableCell>{Object.values(value)[0]}º C</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                }
                {avgTempsByDay.length == 0 && avgTempsByWeek.length == 0 && <Typography variant="body2" sx={{ mb: 1 }}>No Temperatures</Typography>}
                </Box>
                <Box sx={{ p: 2, pb: 1 }}>
                  {avgTempsByWeek.length > 0 && 
                    <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 500 }} aria-label="simple table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Week</TableCell>
                          <TableCell >Average Temperature</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {avgTempsByWeek.map((value) => (
                          <TableRow
                            key={Object.keys(value)[0]}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >
                            <TableCell component="th" scope="row">
                              {Object.keys(value)[0]}
                            </TableCell>
                            <TableCell>{Object.values(value)[0]}º C</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  }
                </Box>
          </Card>
        </Grid>

        <Grid xs={12} md={6} lg={8}>
          <Card>
              <CardHeader title='Weather Alerts'  />
              <Box sx={{ p: 3, pb: 1 }}>
                {weatherAlertsData && 
                  <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Alert Type</TableCell>
                        <TableCell align="right">Level</TableCell>
                        <TableCell align="right">Start Time</TableCell>
                        <TableCell align="right">End Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weatherAlertsData.map((row) => (
                        <TableRow
                          key={row.name}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {row.type}
                          </TableCell>
                          <TableCell align="right">{row.level}</TableCell>
                          <TableCell align="right">{row.startTime}</TableCell>
                          <TableCell align="right">{row.endTime}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                }
                {!weatherAlertsData && <Typography variant="body2" sx={{ mb: 1 }}>No weather alerts</Typography>}
              </Box>
          </Card>
        </Grid>
      </Grid>
      <br></br>
      <br></br>
      <br></br>
      <br></br>

      <Typography variant="h5" sx={{ mb: 5 }}>
        Water Consumption Weekly
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} md={6} lg={8}>
          <AppEnvironmentalImpactChart
            title="Water Consumption"
            subheader={`in Litres (L)`}
            chart={{
              labels: [
                "8 weeks ago",
                "7 weeks ago",
                "6 weeks ago",
                "5 weeks ago",
                "4 weeks ago",
                "3 weeks ago",
                "2 weeks ago",
                "last week",
                "this week",
              ],
              series: [
                {
                  name: "Water",
                  type: "bar",
                  color: "#0000FF",
                  fill: "solid",
                  unit: "L",
                  data: waterConsumptionWeekly,
                },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={4}>
          <Card>

              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <CardHeader title='PH Values' />
                </Grid>
                <Grid item sx={{pt: 4, pr: 3}}>
                  <Button
                    variant="contained"
                    color="inherit"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={handleOpen}
                  >
                    Add New Value
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ p: 3, pb: 1 }}>
                {phValues && 
                  <TableContainer component={Paper}>
                  <Table aria-label="simple table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">PH Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {phValues.map((row) => (
                        console.log(row),
                        <TableRow
                          key={row.name}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {row.date}
                          </TableCell>
                          <TableCell align="right">{row.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                }
                {!phValues && <Typography variant="body2" sx={{ mb: 1 }}>No PH Values were found</Typography>}
              </Box>


              <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
              >
                <Box sx={style}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ mb: 5 }}
                  >
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                      Add a new PH value from a grape sample
                    </Typography>
                  </Box>

                  <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                  
                  {renderForm}

                  </Typography>
                </Box>
              </Modal>

              <Modal
                open={openWaterLimit}
                onClose={handleCloseWaterLimit}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
              >
                <Box sx={style}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ mb: 5 }}
                  >
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                      Update Water Consumption Limit
                    </Typography>
                  </Box>

                  <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                      Recommended value: {size*0.95}
                    </Typography>
                  
                  {renderFormWaterLimit}

                  </Typography>
                </Box>
              </Modal>
              <Modal
                open={openProduction}
                onClose={handleCloseProduction}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
              >
                <Box sx={style}>
                  <Typography
                    id="modal-modal-title"
                    variant="h6"
                    component="h2"
                    sx={{ mb: 2 }}
                  >
                    Add Production Information
                  </Typography>
                  <TextField
                    required
                    id="outlined-required"
                    label="Value (L)"
                    fullWidth
                    sx={{ mb: 2 }}
                    onChange={(e) => setProduction(e.target.value)}
                    value={production}
                  />
                  {alertProduction && <Typography sx={{ mb: 2, color: 'red' }}>Value cannot be empty or negative</Typography>}
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Date"
                      slotProps={{ textField: { fullWidth: true } }}
                      sx={{ mb: 2 }}
                      inputFormat="yyyy-MM-dd"
                      onChange={(newValue) => {
                        const year = newValue.year();
                        setDateProduction(year);
                      }}
                    />
                  </LocalizationProvider>
                  {alertDateProduction && <Typography sx={{ mb: 2, color: 'red' }}>Date cannot be empty</Typography>}
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3 }}
                    onClick={handelSubmitProduction}
                  >
                    Submit
                  </Button>
                  <Button
                    variant="contained"
                    color="inherit"
                    sx={{ mt: 3, ml: 2 }}
                    onClick={handleCloseProduction}
                  >
                    Cancel
                  </Button>
                </Box>
              </Modal>



          </Card>
        </Grid>
      </Grid>

      {/* BOM PARA USAR NOUTRO SITIO
        <Grid xs={12} md={6} lg={8}>
          <AppTasks
            title="Tasks"
            list={[
              { id: '1', name: 'Create FireStone Logo' },
              { id: '2', name: 'Add SCSS and JS files if required' },
              { id: '3', name: 'Stakeholder Meeting' },
              { id: '4', name: 'Scoping & Estimations' },
              { id: '5', name: 'Sprint Showcase' },
            ]}
          />
        </Grid>
            */}
    </Container>
  );
}
