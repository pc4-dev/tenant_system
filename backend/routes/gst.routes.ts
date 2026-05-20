import { Router } from 'express';

const router = Router();

// Mock GST Data Store
const mockGstData: Record<string, any> = {
  "23ACLPG9284H1ZC": {
    legal_name: "Swastik Grah Nirman Company",
    trade_name: "Swastik Grah Nirman",
    address: "D-2, Silver Estate, University Road, Gwalior",
    state: "Madhya Pradesh",
    pincode: "474011"
  },
  "27AAACR1234A1Z5": {
    legal_name: "Reliance Industries Limited",
    trade_name: "RIL",
    address: "Maker Chambers IV, 222, Nariman Point, Mumbai",
    state: "Maharashtra",
    pincode: "400021"
  }
};

router.get('/:gstNumber', (req, res) => {
  const { gstNumber } = req.params;
  
  // Validate GST format: 09AAAAA0000A1Z5
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
  
  if (!gstRegex.test(gstNumber)) {
    return res.status(400).json({ error: "Invalid GST Number format" });
  }

  // Simulate API Delay
  setTimeout(() => {
    const details = mockGstData[gstNumber];
    
    if (details) {
      res.json({ billingAddress: details.address });
    } else {
      // For the specific example in requirements
      if (gstNumber === '23AACCT1282E1ZR') {
        return res.json({
          billingAddress: "7th Floor, Unit No 706 and 707, Maloo 1, Plot No 26-C/CA, Scheme No 94, Sector C Ring Road, Indore, Madhya Pradesh - 452010"
        });
      }

      const stateCode = gstNumber.substring(0, 2);
      res.json({
        billingAddress: `Registered Office Premises 101, Business Hub, City Centre, State Code ${stateCode} - 400001`
      });
    }
  }, 1200);
});

export default router;
