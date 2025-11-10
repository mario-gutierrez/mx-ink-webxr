# MX Ink WebXR

This template uses Three.js and WebXR to provide an immersive 3D painting experience using Logitech MX-INK.

<p align="center">
<img src="https://github.com/user-attachments/assets/a0bdc4d3-40b8-4f5e-99eb-8d664477294b" alt="MX Ink WebXR Demo" width="500"/>
</p>

## Prerequisites

- Node.js (version 12.0 or higher recommended)
- Logitech MX-INK Stylus
- Quest 3/3S headset 

## Setup

1. Clone the repository:
```sh
git clone https://github.com/yourusername/mx-ink-webxr.git
cd mx-ink-webxr
```

2. Install dependencies:
```sh
npm install
```

## Running the Application

To run the application in development mode:
```sh
npm run dev
```

This will start a local development server. Open your browser and navigate to `http://localhost:5173` (or the port specified in your console output).

Use adb port reversing to sue the localhost url in the headset:

```sh
adb reverse tcp:5173 tcp:5173
```

## Debugging

After browsing to your website on the device in Browser, you can debug it remotely using the Chrome Developer tools.

To start a remote debugging session:

1. On the device, browse to your website in Browser.
2. Launch Google Chrome.
3. Navigate to `chrome://inspect/#devices`.
4. Find your device, which will be followed by a set of Browser tabs currently open on the device.
5. Click inspect to start debugging a tab in Browser.

## Building for Production

To create a production build:

```sh
npm run build
```


This will generate optimized files in the `dist` directory.

## Deploying

After building, you can deploy the contents of the `dist` directory to your preferred hosting platform.

## Usage

1. Open the application in Quest browser.
2. Click the "Enter XR" button to start.
3. Use your stylus to paint in 3D space.
4. Enjoy!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).
