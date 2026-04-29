const express = require("express")
const cors = require("cors")

const app = express()

const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// health check
app.get("/", (req, res) => {
  res.send("Split Bill API FINAL 🚀")
})

app.post("/calculate", (req, res) => {
  const { paidBy, menu, orders, tax = 0, service = 0 } = req.body

  // validasi
  if (!paidBy || !menu || !orders) {
    return res.status(400).json({
      error: "paidBy, menu, orders wajib diisi"
    })
  }

  // 1. map menu
  const menuMap = {}
  menu.forEach(m => {
    if (m.name) {
      menuMap[m.name] = Number(m.price || 0)
    }
  })

  // 2. subtotal per orang
  const personSubtotal = {}
  let subtotal = 0

  for (const o of orders) {
    const price = menuMap[o.menu]

    if (price === undefined) {
      return res.status(400).json({
        error: `Menu ${o.menu} tidak ditemukan`
      })
    }

    const totalItem = price * o.qty

    // 🔥 CASE 1: SHARING
    if (o.sharedBy && Array.isArray(o.sharedBy)) {
      const splitCount = o.sharedBy.length

      if (splitCount === 0) {
        return res.status(400).json({
          error: `sharedBy kosong di menu ${o.menu}`
        })
      }

      const shareAmount = totalItem / splitCount

      o.sharedBy.forEach(person => {
        if (!personSubtotal[person]) {
          personSubtotal[person] = 0
        }

        personSubtotal[person] += shareAmount
      })

      subtotal += totalItem
    }

    // 🔥 CASE 2: NORMAL
    else {
      if (!o.person) {
        return res.status(400).json({
          error: `Person kosong di order ${o.menu}`
        })
      }

      if (!personSubtotal[o.person]) {
        personSubtotal[o.person] = 0
      }

      personSubtotal[o.person] += totalItem
      subtotal += totalItem
    }
  }

  // edge case
  if (subtotal === 0) {
    return res.status(400).json({
      error: "Subtotal tidak boleh 0"
    })
  }

  // 3. tax & service
  const taxAmount = subtotal * (tax / 100)
  const serviceAmount = subtotal * (service / 100)
  const total = subtotal + taxAmount + serviceAmount

  // 4. init balance
  const balances = {}
  Object.keys(personSubtotal).forEach(p => {
    balances[p] = 0
  })

  // 5. distribusi biaya
  Object.keys(personSubtotal).forEach(p => {
    const ratio = personSubtotal[p] / subtotal

    const finalShare =
      personSubtotal[p] +
      (taxAmount * ratio) +
      (serviceAmount * ratio)

    balances[p] -= finalShare
  })

  // 6. yang bayar cover semua
  balances[paidBy] = (balances[paidBy] || 0) + total

  // 7. split debtor & creditor
  const creditors = []
  const debtors = []

  Object.keys(balances).forEach(name => {
    const val = Math.round(balances[name])

    if (val > 0) {
      creditors.push({ name, amount: val })
    } else if (val < 0) {
      debtors.push({ name, amount: -val })
    }
  })

  // 8. settlement
  const transfers = []

  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]
    const c = creditors[j]

    const pay = Math.min(d.amount, c.amount)

    transfers.push({
      from: d.name,
      to: c.name,
      amount: pay
    })

    d.amount -= pay
    c.amount -= pay

    if (d.amount === 0) i++
    if (c.amount === 0) j++
  }

  res.json({
    subtotal,
    taxAmount,
    serviceAmount,
    total,
    personSubtotal, // 🔥 tambahan biar frontend bisa detail
    balances,
    transfers
  })
})

app.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`)
})