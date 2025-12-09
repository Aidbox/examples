import { toBAR, stringifyMessage } from './src/to_bar.js'
import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import morgan from 'morgan'
import { swaggerDocument } from './src/swagger.js'
import { BundleEntry } from './types/hl7-fhir-r4-core/Bundle.js'
import { getInvoiceResources } from './src/aidbox.js'
import { MLLPServer } from 'mllp-node-sl7'

// Create a new express application instance
const app = express()

// Set network envs
const port = process.env.PORT || 3000
const secret = process.env.SECRET
const receiverPort = process.env.MLLP_RECEIVER_PORT || 2575
const receiverHost = process.env.MLLP_RECEIVER_HOST

// Define the root path with a greeting message
app.get("/ping", (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the HL7v2 conversion server!'})
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use(express.json({type: 'application/fhir+json'}))
app.use(morgan('combined'))
app.use((req, res, next) => {
    if (req.headers.authorization
        && req.headers.authorization === secret)
        return next()
    res.status(403).send('Authentication required.')
})

let mllpServer = new MLLPServer('0.0.0.0', 2575)

mllpServer.on('hl7', (data) => {
    console.log('Received HL7 message: \n' + data)
})

app.post('/webhook', async (req, res) => {
    let invoice = req.body.entry.filter((x: BundleEntry) => x.resource?.resourceType === 'Invoice')[0].resource
    let resources = await getInvoiceResources(invoice)
    let status = 200
    let body: Record<string,any> = {}
    console.log(stringifyMessage(toBAR(invoice, resources)))
    mllpServer.send(receiverHost!,
        receiverPort as number,
        stringifyMessage(toBAR(invoice, resources)),
        (err, data) => {
            if (err) {
                status = 500
                body = {message: 'An error happened when sending MLLP message: ' + err}
                console.log(body.message)
            } else {
                body = {message: 'Successful MLLP message send: \n' + data}
                console.log(body.message)
            }
        })
    res.statusCode = status
    res.json(body)
})

app.post('/test', async (req, res) => {
    let invoice = req.body.entry.filter((x: BundleEntry) => x.resource?.resourceType === 'Invoice')[0].resource
    let resources = await getInvoiceResources(invoice)
    let status = 200
    let body: string = stringifyMessage(toBAR(invoice, resources))
    console.log('Test BAR message: ' + body)
    res.status(status).send(body)
})

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`)
});