import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  IconButton
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Login as LoginIcon,
  HowToReg as RegisterIcon,
  Nature as NatureIcon,
  LocalOffer as RewardsIcon,
  TrendingUp as StatsIcon,
  FiberManualRecord as DotIcon
} from '@mui/icons-material';

const AnimatedCounter = ({ target, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const startTime = performance.now();
          const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const currentCount = Math.floor(progress * target);
            
            setCount(currentCount);
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [target, duration]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${Math.floor(num / 1000)},${(num % 1000).toString().padStart(3, '0')}+`;
    }
    return `${num}+`;
  };

  return (
    <span ref={ref}>
      {formatNumber(count)}
    </span>
  );
};

const LandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 50%, #80deea 100%)',
      pt: isMobile ? 2 : 8,
      pb: 8
    }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Grid container spacing={4} alignItems="center" sx={{ mb: 8 }}>
          <Grid item xs={12} md={7}>
            <Typography 
              variant={isMobile ? 'h3' : 'h2'} 
              component="h1" 
              gutterBottom
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.dark,
                lineHeight: 1.2
              }}
            >
              Recycle Plastic, <br />
              <Box component="span" sx={{ color: theme.palette.success.main }}>
                Earn Rewards
              </Box>
            </Typography>
            <Typography variant="h6" component="p" sx={{ mb: 4 }}>
              Turn your plastic waste into valuable rewards while saving the planet.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                color="primary"
                size="large"
                startIcon={<RegisterIcon />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 50,
                  boxShadow: 3
                }}
              >
                Join Now
              </Button>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<LoginIcon />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 50,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2 }
                }}
              >
                Sign In
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-start',
              height: '100%'
            }}>
              <Box
                component="img"
                src="/recycling.png"
                alt="People recycling plastic"
                sx={{
                  width: isMobile ? '100%' : '80%',
                  maxWidth: 400,
                  height: 'auto',
                  borderRadius: 1,
                }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Section Divider */}
        <Divider sx={{ my: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }} />

        {/* How It Works Section */}
        <Typography 
          variant="h4" 
          component="h2" 
          align="center" 
          sx={{ 
            mb: 6, 
            fontWeight: 700,
          }}
        >
          How It Works
        </Typography>
        <Grid container spacing={4} sx={{ mb: 10, display: 'flex', alignItems: 'stretch' }}>
          {[
            {
              icon: <DeleteIcon fontSize="large" color="primary" />,
              title: "1. Collect Plastic",
              text: "Gather your clean plastic waste at home or work"
            },
            {
              icon: <StatsIcon fontSize="large" color="primary" />,
              title: "2. Deposit at Station",
              text: "Bring it to one of our smart recycling stations"
            },
            {
              icon: <RewardsIcon fontSize="large" color="primary" />,
              title: "3. Earn Points",
              text: "Get rewarded based on the quantity you recycle"
            }
          ].map((step, index) => (
            <Grid item xs={12} md={4} key={index} sx={{ display: 'flex' }}>
              <Card sx={{
                flex: 1,
                p: 3,
                borderRadius: 2,
                boxShadow: 0,
                border: '1px solid rgba(0,0,0,0.1)',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 1
                }
              }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>
                    {step.icon}
                  </Box>
                  <Typography 
                    variant="h5" 
                    component="h3" 
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography>
                    {step.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Section Divider */}
        <Divider sx={{ my: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }} />

        {/* Impact Stats Section */}
        <Paper elevation={0} sx={{
          p: 4,
          mb: 10,
          borderRadius: 2,
          background: 'linear-gradient(to right, #4caf50, #81c784)',
          color: 'white',
          border: '1px solid rgba(0,0,0,0.1)'
        }}>
          <Typography 
            variant="h4" 
            component="h2" 
            align="center" 
            sx={{ 
              mb: 4, 
              fontWeight: 700,
            }}
          >
            Our Community Impact
          </Typography>
          <Grid container spacing={2} justifyContent="center" alignItems="center">
            {[
              { value: 1, label: "Active Recyclers" },
              { value: 0, label: "Tons Recycled" },
              { value: 300, label: "Points Awarded" },
              { value: 1, label: "Recycling Stations" }
            ].map((stat, index, array) => (
              <React.Fragment key={index}>
                <Grid item xs={6} sm={3}>
                  <Box 
                    textAlign="center"
                    sx={{
                      position: 'relative',
                      px: 2,
                    }}
                  >
                    <Typography variant="h3" component="div" sx={{ fontWeight: 700 }}>
                      {stat.label === "Tons Recycled" ? (
                        <>{stat.value}+</>
                      ) : (
                        <AnimatedCounter target={stat.value} duration={2000} />
                      )}
                    </Typography>
                    <Typography variant="h6">
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
                {index < array.length - 1 && !isMobile && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DotIcon sx={{ 
                      fontSize: 8, 
                      color: 'rgba(255,255,255,0.5)', 
                      mx: 1 
                    }} />
                  </Box>
                )}
              </React.Fragment>
            ))}
          </Grid>
        </Paper>

        {/* Section Divider */}
        <Divider sx={{ my: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }} />

        {/* Call to Action */}
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Typography 
            variant="h3" 
            component="h2" 
            sx={{ 
              mb: 3, 
              fontWeight: 700,
            }}
          >
            Ready to Start Recycling?
          </Typography>
          <Typography variant="h6" component="p" sx={{ mb: 4 }}>
            Join thousands of environmentally-conscious users earning rewards today!
          </Typography>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            color="primary"
            size="large"
            startIcon={<DeleteIcon />}
            sx={{
              px: 6,
              py: 2,
              borderRadius: 50,
              fontSize: '1.1rem',
              boxShadow: 4,
              '&:hover': {
                boxShadow: 6
              }
            }}
          >
            Get Started Now
          </Button>
        </Box>

        {/* Footer */}
        <Divider sx={{ my: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2">
            Smart Bin 1.0 © {new Date().getFullYear()} Built By Sheryl Chebet
          </Typography>
          <Box>
            <IconButton color="primary">
              {/* Add social media icons here */}
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LandingPage;