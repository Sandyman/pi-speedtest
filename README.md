# Pi Speedtest

Use this module to regularly measure your internet speed using your Raspberry Pi (or any other suitable Linux device).

This module was devised to be run on a Raspberry Pi, but because it's a Node module, you can run it on any system
that supports node. If you do use a Raspberry Pi, it's strongly suggested to connect it to your internet modem using
a cable, and to not use the Wifi. Wifi can sometimes be dodgy for reasons beyond the influence of your ISP, but when
you use a cable, you can be pretty sure the speed you measure is the best speed your internet connection can provide.

### Getting started

Before you start using this module, please go to https://app.pi-speedtest.net and sign up using your GitHub account.
For now, only GitHub is supported for logging in, but we reckon most people who fiddle around with Raspberry Pi's
have a GitHub account.

When you first log in, you need to create an Access Token that will identify you when you start using this module. On
the Account page, click on "What is this?" in the Authentication section (no token will be shown at this stage).
Click on the button that says "Regenerate" and a token will be created for you. You can copy the entire string using
the "Copy" button (it's the button with the clipboard on it) and store it on your Raspberry Pi:

```$ joe ~/.st/config```

(or use your own favourite editor). Your file should look something like this:

token 5f598b0a6717ac43df0d13340ac943a4fcd3992c28f435421d6fd442c6fd448b

Next, you need to install the command `at`. This is a utility that allows for scheduling commands at a certain time.
This module uses `at` to schedule the next measurement. If you are using a Debian based distribution on your Pi, you
should be able to install at like so:

$ sudo apt install at

and follow the prompt that may occur.

You are now ready to start measuring your internet speed.

Install this module:

```$ npm install -g pi-speedtest```

This will install the module globally. You can run using using the command `pi-speedtest`.
### Next steps

You can run a single test using this command:

```$ pi-speedtest -V```

The flag -V means "verbose". Omitting it will turn the module silent.

This test will test the connection to our backend, and will only run if the connection works (meaning you are using
a valid token).

After running the test, the results will be shown in the console. If you go to the site and refresh the data,
you should see the results there too.

Now, you can start continuously measuring your internet connection speed:

```$ pi-speedtest start```

(Use `-V` to see its output.)

This will set up a recurring call to the module in order to measure the speed. At any time you can check that a
measurement is scheduled by running the command `atq`. Measurements occur at slightly random times, but on average
six times a day, or once every four hours or so.

You can stop continuous measurements by running this command:

```$ pi-speedtest stop```

(Use `-V` to see its output.)

The recurring call will now be removed. Please note that you can run a manual test at any time using the command:

```$ pi-speedtest test -V```

## Disclaimer

This module is a work in progress. It comes without any implied warranty. It uses the module "speedtest-net" to do
the actual measurement.