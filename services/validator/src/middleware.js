let injectFault = false;

const fault = (req, res, next) => {
  if (req.path === '/503' && !injectFault) {
    injectFault = true;
    
    setTimeout(
        () => {
            injectFault = false;
        },
        180 * 1000
    );

    return res.send('Fault injected');
  }

  if (injectFault) {
      return res.status(503).send('Service unavailable');       
  }

  next();
}

module.exports = fault;